import { conversationsTable } from "./tables.js";

type ConversationEntity = {
  partitionKey: string; // userId
  rowKey: string; // conversation id (or channel id composite)
  conversationJson: string;
  updatedAt: string;
};

function conversationRowKey(conversationReference: any): string {
  // Teams conversation reference should include:
  // - conversation.id
  // - channelId
  // If missing, fall back to a stable-ish composite.
  const convId = conversationReference?.conversation?.id ?? "";
  const channelId = conversationReference?.channelId ?? "";
  return `${channelId}:${convId}`.replace(/[:]+$/, "");
}

export async function saveConversationReference(userId: string, conversationReference: any) {
  const table = conversationsTable();
  const now = new Date().toISOString();
  const userEntity: ConversationEntity = {
    partitionKey: userId,
    rowKey: conversationRowKey(conversationReference) || now,
    conversationJson: JSON.stringify(conversationReference),
    updatedAt: now
  };

  await table.upsertEntity(userEntity, "Replace");

  // Also store a channel-scoped reference so the bot can post wrap-ups to a channel proactively.
  const channelConversationId = conversationReference?.conversation?.id;
  if (channelConversationId) {
    const channelEntity: ConversationEntity = {
      partitionKey: `channel:${channelConversationId}`,
      rowKey: conversationRowKey(conversationReference) || now,
      conversationJson: JSON.stringify(conversationReference),
      updatedAt: now
    };
    await table.upsertEntity(channelEntity, "Replace");
  }
}

export async function getConversationReferenceForUser(userId: string): Promise<any[]> {
  const table = conversationsTable();
  const results = [];
  for await (const entity of table.listEntities<ConversationEntity>()) {
    if (entity.partitionKey !== userId) continue;
    try {
      results.push(JSON.parse(entity.conversationJson));
    } catch {
      // ignore malformed entries
    }
  }
  return results;
}

export async function getConversationReferenceForChannel(channelConversationId: string): Promise<any[]> {
  const table = conversationsTable();
  const partitionKey = `channel:${channelConversationId}`;
  const results = [];

  for await (const entity of table.listEntities<ConversationEntity>()) {
    if (entity.partitionKey !== partitionKey) continue;
    try {
      results.push(JSON.parse(entity.conversationJson));
    } catch {
      // ignore malformed entries
    }
  }

  return results;
}

