import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BotFrameworkAdapter } from "botbuilder";
import { createClerkBot } from "../bot/clerkBot.js";

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

app.http("messages", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "api/messages",
  handler: async (
    req: HttpRequest,
    ctx: InvocationContext
  ): Promise<HttpResponseInit> => {
    const activity = (await req.json()) as any;
    const authHeader = req.headers.get("authorization") ?? "";

    const adapter = getAdapter();
    const clerkBot = createClerkBot();

    adapter.onTurnError = async (turnContext, error) => {
      ctx.log.error("Bot error", error);
      try {
        await turnContext.sendActivity("Sorry, something went wrong.");
      } catch {
        // ignore secondary failures
      }
    };

    await adapter.processActivity(activity, authHeader, async (turnContext) => {
      await clerkBot.run(turnContext);
    });

    return { status: 200 };
  }
});

