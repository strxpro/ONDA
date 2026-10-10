import type { SiteData } from "@/lib/types";

/** Content tables the admin and the bot can edit. */
export const TABLES = ["site_settings", "flavors", "price_items", "opening_hours", "special_days", "announcements", "sections", "gallery", "reviews", "comments", "reservations", "contacts"] as const;
export type TableName = (typeof TABLES)[number];

/** Primary key column per table. */
export const PK: Record<TableName, string> = {
  site_settings: "id",
  flavors: "id",
  price_items: "id",
  opening_hours: "weekday",
  special_days: "date",
  announcements: "id",
  sections: "key",
  gallery: "id",
  reviews: "id",
  comments: "id",
  reservations: "id",
  contacts: "ref_id",
};
/** Tables never pushed to visitors' browsers (live events). */
export const PRIVATE_TABLES: TableName[] = ["reservations", "contacts"];

export type Row = Record<string, unknown>;
export type Key = string | number;

export type Actor = { actor: string; source: "admin" | "telegram" | "system" };

export type AuditEntry = {
  id: number;
  actor: string;
  source: Actor["source"];
  action: string;
  table_name: TableName;
  row_id: string;
  before: Row | null;
  after: Row | null;
  undone_at: string | null;
  undo_of: number | null;
  batch_id: string | null;
  created_at: string;
};

export type PageView = { path: string; visitor_hash: string; referrer: string | null; country: string | null; device: string; locale: string | null; created_at?: string };

export type Stats = {
  visits: number;
  visitors: number;
  top_pages: { path: string; views: number }[];
  devices: { device: string; views: number }[];
  countries: { country: string; views: number }[];
  daily: { day: string; views: number; visitors: number }[];
};

export type PendingAction = {
  id: string;
  telegram_user_id: number;
  chat_id: number;
  tool: string;
  args: Row;
  summary: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  created_at: string;
  expires_at: string;
};

export type AdminUser = { id: string; email: string | null; telegram_user_id: number | null; display_name: string | null; role: string };

/** Storage backend: Supabase in production, a JSON file for local development. */
export interface Backend {
  readonly kind: "supabase" | "file";
  readAll(): Promise<SiteData>;
  list(table: TableName): Promise<Row[]>;
  get(table: TableName, key: Key): Promise<Row | null>;
  /** Insert or replace a full row (no audit — use lib/mutations for that). */
  put(table: TableName, row: Row): Promise<Row>;
  remove(table: TableName, key: Key): Promise<void>;

  addAudit(e: Omit<AuditEntry, "id" | "created_at" | "undone_at" | "undo_of"> & { undo_of?: number | null }): Promise<AuditEntry>;
  listAudit(limit: number): Promise<AuditEntry[]>;
  auditGroup(id: number): Promise<AuditEntry[]>;
  markUndone(ids: number[]): Promise<void>;

  addPageView(v: PageView): Promise<void>;
  stats(from: Date, to: Date): Promise<Stats>;

  createPending(p: Omit<PendingAction, "id" | "created_at" | "status">): Promise<PendingAction>;
  getPending(id: string): Promise<PendingAction | null>;
  setPendingStatus(id: string, status: PendingAction["status"]): Promise<void>;
  /** replace a pending action's args (e.g. the options ticked so far on a multi-choice question) */
  setPendingArgs(id: string, args: Record<string, unknown>): Promise<void>;
  /** the newest still-open pending action of a kind for this Telegram user (e.g. a question waiting for a typed answer) */
  latestPending(telegramUserId: number, tool: string): Promise<PendingAction | null>;

  adminByEmail(email: string): Promise<AdminUser | null>;
  adminByTelegram(id: number): Promise<AdminUser | null>;
}
