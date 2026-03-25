import { ActivityHandler, TurnContext } from "botbuilder";
import type { TaskInstance } from "@clerkbot/shared";
import { saveConversationReference } from "../storage/conversationStore.js";
import { getOpenTasksForUser, markTaskDone } from "../storage/taskStore.js";
import { getConfig } from "../storage/configStore.js";
import { ensureTasksForDate } from "../taskEngine/ensureTasksForDate.js";
import { utcToZonedTime } from "date-fns-tz";

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export class ClerkBot extends ActivityHandler {
  async onMessage(context: TurnContext, next: () => Promise<void>) {
    const textRaw = context.activity.text ?? "";
    const text = normalizeText(textRaw);

    const fromId = context.activity.from?.id;
    if (!fromId) return;

    // Capture conversation reference so we can send proactive DMs later.
    const conversationReference = TurnContext.getConversationReference(context.activity);
    await saveConversationReference(fromId, conversationReference);

    // For best UX, ensure tasks for "today" exist before serving `status` / `done`.
    // Note: we interpret “today” in Europe/Copenhagen.
    const nowCopenhagen = utcToZonedTime(new Date(), "Europe/Copenhagen");
    const cfg = await getConfig();

    if (text === "help") {
      await context.sendActivity(
        [
          "Clerk Bot commands:",
          "`status` - show your open tasks.",
          "`done <task>` - mark a task as completed.",
          "`help` - show this help."
        ].join("\n")
      );
      await next();
      return;
    }

    if (text === "status") {
      if (!cfg) {
        await context.sendActivity("No bot config found yet. Ask the admin to set up tasks/rotation first.");
        await next();
        return;
      }
      await ensureTasksForDate(cfg, nowCopenhagen);
      const openTasks = await getOpenTasksForUser(fromId);
      if (openTasks.length === 0) {
        await context.sendActivity(
          "No open tasks found yet. (If you just set up the bot/admin config, wait for the scheduler.)"
        );
        await next();
        return;
      }
      await context.sendActivity(
        [
          `You have ${openTasks.length} open task(s):`,
          ...openTasks.slice(0, 20).map((t) => `- ${t.taskDefinitionId}${t.dueDate ? ` (due ${t.dueDate})` : ""}`)
        ].join("\n")
      );
      await next();
      return;
    }

    if (text.startsWith("done ")) {
      if (!cfg) {
        await context.sendActivity("No bot config found yet. Ask the admin to set up tasks/rotation first.");
        await next();
        return;
      }
      await ensureTasksForDate(cfg, nowCopenhagen);
      const doneLabel = text.slice("done ".length).trim();
      if (!doneLabel) {
        await context.sendActivity("Usage: `done <task>`");
        await next();
        return;
      }

      const updated = await this.markBestMatchingTaskDone(fromId, doneLabel);
      if (!updated) {
        await context.sendActivity(
          `I couldn't find an open task matching "${doneLabel}". Try ` +
            "`status` to see what I'm expecting, or `help`."
        );
        await next();
        return;
      }

      await context.sendActivity("Marked as done. Reply `status` to see what's remaining.");
      await next();
      return;
    }

    await context.sendActivity("I didn't understand that. Try `help`.");
    await next();
  }

  private async markBestMatchingTaskDone(userId: string, label: string): Promise<boolean> {
    const openTasks = await getOpenTasksForUser(userId);
    const match = this.pickTaskByLooseMatch(openTasks, label);
    if (!match) return false;

    await markTaskDone(match.id, userId);
    return true;
  }

  private pickTaskByLooseMatch(tasks: TaskInstance[], label: string): TaskInstance | null {
    // MVP: match against taskDefinitionId substring; later we can map to localized titles.
    const direct = tasks.find((t) => t.taskDefinitionId.toLowerCase() === label);
    if (direct) return direct;

    const partial = tasks.find((t) => t.taskDefinitionId.toLowerCase().includes(label));
    if (partial) return partial;

    // Try token overlap
    const tokens = new Set(label.split(/[^a-zæøå0-9]+/i).filter(Boolean));
    for (const t of tasks) {
      const hay = t.taskDefinitionId.toLowerCase();
      let hits = 0;
      for (const tok of tokens) if (tok && hay.includes(tok)) hits++;
      if (hits >= Math.max(2, Math.floor(tokens.size / 2))) return t;
    }
    return null;
  }
}

let singleton: ClerkBot | null = null;

export function createClerkBot(): ClerkBot {
  if (!singleton) singleton = new ClerkBot();
  return singleton;
}

