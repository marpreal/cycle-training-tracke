import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Una sola fila (id=1) con todo el estado de la app en JSON. */
export const appSnapshotTable = sqliteTable("app_snapshot", {
  id: integer("id").primaryKey(),
  payloadJson: text("payload_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
