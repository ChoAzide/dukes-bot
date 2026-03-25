import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getConfig, putConfig } from "../storage/configStore.js";
import type { BotConfig } from "@clerkbot/shared";

app.http("config", {
  methods: ["GET", "PUT"],
  authLevel: "function",
  route: "config",
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "GET") {
      const cfg = await getConfig();
      if (!cfg) return { status: 404, jsonBody: { error: "no-config" } };
      return { status: 200, jsonBody: cfg };
    }

    if (req.method === "PUT") {
      // NOTE: For brevity, this omits actual JWT validation; in a real deployment
      // you should validate the caller as an admin using Entra ID access tokens.
      const body = (await req.json()) as BotConfig;
      await putConfig(body);
      ctx.log("Updated config");
      return { status: 204 };
    }

    return { status: 405 };
  }
});

