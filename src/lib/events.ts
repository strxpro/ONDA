import { EventEmitter } from "node:events";
import type { Row, TableName } from "./store/types";

/** A content change, pushed to open browsers (Supabase Realtime in prod, SSE in local dev). */
export type ChangeEvent = { table: TableName; key: string; row: Row | null };

const g = globalThis as unknown as { __ondaBus?: EventEmitter };
export const bus = (g.__ondaBus ??= new EventEmitter().setMaxListeners(500));

export function emitChange(e: ChangeEvent) {
  bus.emit("change", e);
}
