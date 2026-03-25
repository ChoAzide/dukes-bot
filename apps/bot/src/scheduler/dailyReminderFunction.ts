import { app, InvocationContext } from "@azure/functions";
import { BotFrameworkAdapter, TurnContext } from "botbuilder";
import { utcToZonedTime } from "date-fns-tz";
import type { BotConfig } from "@clerkbot/shared";
import { getConfig } from "../storage/configStore.js";
import { ensureTasksForDate } from "../taskEngine/ensureTasksForDate.js";
import { getOpenTasksForUser } from "../storage/taskStore.js";
import { getConversationReferenceForUser } from "../storage/conversationStore.js";
import { isDailyReminderSent, markDailyReminderSent } from "../storage/auditStore.js";
import { isWeekday } from "@clerkbot/shared";

function getAdapter(): BotFrameworkAdapter {
  const appId = process.env.MICROSOFT_APP_ID;
  const appPassword = process.env.MICROSOFT_APP_PASSWORD;
  if (!appId) throw new Error("MICROSOFT_APP_ID is required");
  if (!appPassword) throw new Error("MICROSOFT_APP_PASSWORD is required");
  return new BotFrameworkAdapter({
    appId,
    appPassword
  });
}

function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function atSameMinute(a: Date, hour: number, minute: number): boolean {
  return a.getHours() === hour && a.getMinutes() === minute;
}

async function sendDueTasksDm(adapter: BotFrameworkAdapter, conversationReference: any, msg: string) {
  await adapter.continueConversation(conversationReference, async (turnContext: TurnContext) => {
    await turnContext.sendActivity(msg);
  });
}

app.timer("dailyReminder", {
  // Every 5 minutes; we gate in code using Europe/Copenhagen + config reminder time.
  schedule: "0 */5 * * * *"
}, async (myTimer: any, ctx: InvocationContext) => {
  const cfg = await getConfig();
  if (!cfg) {
    ctx.log("No config yet, skipping reminders.");
    return;
  }

  const nowCopenhagen = utcToZonedTime(new Date(), "Europe/Copenhagen");
  if (cfg.reminder.weekdaysOnly && !isWeekday(nowCopenhagen)) return;
  if (!atSameMinute(nowCopenhagen, cfg.reminder.hour, cfg.reminder.minute)) return;

  const dueYmd = toLocalYmd(nowCopenhagen);

  // Ensure task instances exist for today (includes daily + due weekly/monthly tasks).
  await ensureTasksForDate(cfg, nowCopenhagen);

  const allUserIds = new Set<string>([
    ...cfg.rotation.roster.map((u) => u.userId),
    ...cfg.rotation.sharedWeekRule.users.map((u) => u.userId)
  ]);

  const adapter = getAdapter();

  for (const userId of allUserIds) {
    if (await isDailyReminderSent(userId, dueYmd)) continue;

    const openTasks = await getOpenTasksForUser(userId);
    const dueTasks = openTasks.filter((t) => t.dueDate === dueYmd);

    if (dueTasks.length === 0) continue;

    const refs = await getConversationReferenceForUser(userId);
    if (refs.length === 0) {
      ctx.log(`No conversation reference for user ${userId}, cannot DM.`);
      continue;
    }

    const list = dueTasks
      .map((t) => `- ${t.taskDefinitionId}${t.periodKey ? ` (${t.periodKey})` : ""}`)
      .join("\n");

    const message = `Clerk reminder for ${dueYmd}.\nMissing tasks:\n${list}`;

    try {
      await sendDueTasksDm(adapter, refs[0], message);
      await markDailyReminderSent(userId, dueYmd);
    } catch (e: any) {
      ctx.log.error(`Failed sending DM to ${userId}: ${e?.message ?? e}`);
    }
  }
});

