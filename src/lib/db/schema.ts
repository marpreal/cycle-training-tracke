import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Un snapshot JSON por usuario (Google `sub`). */
export const appSnapshotTable = sqliteTable("app_snapshot", {
  userId: text("user_id").primaryKey(),
  payloadJson: text("payload_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
