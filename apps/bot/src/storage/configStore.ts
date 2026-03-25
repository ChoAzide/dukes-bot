import type { BotConfig } from "@clerkbot/shared";
import { configTable } from "./tables.js";
import { ConfigEntityKey } from "./schema.js";

type ConfigEntity = {
  partitionKey: string;
  rowKey: string;
  configJson: string;
  updatedAt: string;
};

export async function getConfig(): Promise<BotConfig | null> {
  const table = configTable();
  try {
    const entity = await table.getEntity<ConfigEntity>(ConfigEntityKey.partitionKey, ConfigEntityKey.rowKey);
    return JSON.parse(entity.configJson) as BotConfig;
  } catch (e: any) {
    if (e?.statusCode === 404) return null;
    throw e;
  }
}

export async function putConfig(config: BotConfig): Promise<void> {
  const table = configTable();
  const now = new Date().toISOString();
  const entity: ConfigEntity = {
    partitionKey: ConfigEntityKey.partitionKey,
    rowKey: ConfigEntityKey.rowKey,
    configJson: JSON.stringify(config),
    updatedAt: now
  };
  await table.upsertEntity(entity, "Replace");
}

