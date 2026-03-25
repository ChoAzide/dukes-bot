import { z } from "zod";
import type { BotConfig } from "@clerkbot/shared";

const BotConfigSchema = z.any();

export async function fetchConfig(): Promise<BotConfig> {
  const base = process.env.CLERKBOT_API_BASE_URL!;
  const res = await fetch(`${base}/api/config`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
  const json = await res.json();
  BotConfigSchema.parse(json);
  return json as BotConfig;
}

export async function updateConfig(config: BotConfig): Promise<void> {
  const base = process.env.CLERKBOT_API_BASE_URL!;
  const res = await fetch(`${base}/api/config`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error(`Failed to update config: ${res.status}`);
}

