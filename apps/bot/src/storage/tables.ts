import { TableClient } from "@azure/data-tables";
import { Tables } from "./schema.js";

function connectionString(): string {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!cs) throw new Error("AZURE_STORAGE_CONNECTION_STRING is required");
  return cs;
}

export function configTable(): TableClient {
  return TableClient.fromConnectionString(connectionString(), Tables.config);
}

export function taskInstancesTable(): TableClient {
  return TableClient.fromConnectionString(connectionString(), Tables.tasks);
}

export function conversationsTable(): TableClient {
  return TableClient.fromConnectionString(connectionString(), Tables.conversations);
}

export function auditTable(): TableClient {
  return TableClient.fromConnectionString(connectionString(), Tables.audit);
}

