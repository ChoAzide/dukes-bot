export const Tables = {
  config: process.env.TABLE_CONFIG ?? "ClerkBotConfig",
  tasks: process.env.TABLE_TASKS ?? "ClerkBotTaskInstances",
  conversations: process.env.TABLE_CONVERSATIONS ?? "ClerkBotConversations",
  audit: process.env.TABLE_AUDIT ?? "ClerkBotAudit"
} as const;

export const ConfigEntityKey = {
  partitionKey: "config",
  rowKey: "current"
} as const;

