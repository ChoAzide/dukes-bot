import { app, InvocationContext } from "@azure/functions";
import { BotFrameworkAdapter, TurnContext } from "botbuilder";
import { utcToZonedTime } from "date-fns-tz";
import { getConfig } from "../storage/configStore.js";
import { getOpenTasksForPeriod } from "../storage/taskStore.js";
import { getConversationReferenceForChannel } from "../storage/conversationStore.js";
import { isWrapupSent, markWrapupSent } from "../storage/auditStore.js";
import { isoWeekday, periodKeyForWeek } from "@clerkbot/shared";

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

async function sendChannelMessage(adapter: BotFrameworkAdapter, conversationReference: any, msg: string) {
  await adapter.continueConversation(conversationReference, async (turnContext: TurnContext) => {
    await turnContext.sendActivity(msg);
  });
}

function startOfIsoWeekMonday(d: Date): Date {
  const weekday = isoWeekday(d); // 1=Mon ... 7=Sun
  const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  nd.setDate(nd.getDate() - (weekday - 1));
  return nd;
}

app.timer("weeklyWrapup", {
  // Every 30 minutes; we gate to Fridays in Europe/Copenhagen.
  schedule: "0 */30 * * * *"
}, async (myTimer: any, ctx: InvocationContext) => {
  const cfg = await getConfig();
  if (!cfg) return;

  const nowCopenhagen = utcToZonedTime(new Date(), "Europe/Copenhagen");
  // ISO weekday: 5 => Friday
  if (isoWeekday(nowCopenhagen) !== 5) return;

  // Avoid posting at 00:00; pick a reasonable evening window.
  if (nowCopenhagen.getHours() < 17) return;

  const weekMonday = startOfIsoWeekMonday(nowCopenhagen);
  const periodKey = periodKeyForWeek(weekMonday);

  if (await isWrapupSent(periodKey)) return;

  const openTasks = await getOpenTasksForPeriod(periodKey);

  const weeklyTaskIds = new Set(
    cfg.tasks.filter((t) => t.active && t.cadence === "weekly").map((t) => t.id)
  );

  const openWeekly = openTasks.filter((t) => weeklyTaskIds.has(t.taskDefinitionId) && t.status === "open");
  if (openWeekly.length > 0) {
    // Not done yet; try again next timer tick.
    return;
  }

  const channelConversationId = cfg.announcement.teamsChannelConversationId;
  if (!channelConversationId) {
    ctx.log("No announcement channel configured yet; cannot post wrap-up.");
    return;
  }

  const refs = await getConversationReferenceForChannel(channelConversationId);
  if (refs.length === 0) {
    ctx.log("No channel conversation reference stored for announcement channel.");
    return;
  }

  const adapter = getAdapter();
  const message = "Weekly wrap-up: all weekly tasks are done. Someone is awesome.";
  await sendChannelMessage(adapter, refs[0], message);

  await markWrapupSent(periodKey);
});

