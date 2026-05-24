export interface PageParams {
  cursor?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface CursorInfo {
  limit: number;
  cursorCreated: string | null;
  cursorId: string | null;
}

export function parseCursor(params: PageParams): CursorInfo {
  const limit = Math.min(Math.max(1, params.limit ?? DEFAULT_LIMIT), MAX_LIMIT);

  let cursorCreated: string | null = null;
  let cursorId: string | null = null;

  if (params.cursor) {
    const [created, id] = params.cursor.split("|");
    if (created && id) {
      cursorCreated = decodeURIComponent(created);
      cursorId = id;
    }
  }

  return { limit, cursorCreated, cursorId };
}

export function cursorWhere(
  cursorCreated: string | null,
  cursorId: string | null,
  alias: string = "i"
): { clause: string; args: string[] } {
  if (!cursorCreated || !cursorId) {
    return { clause: "", args: [] };
  }
  return {
    clause: `AND (${alias}.created_at, ${alias}.id) < (?1, ?2)`,
    args: [cursorCreated, cursorId],
  };
}

export function makeCursor(createdAt: string, id: string): string {
  return `${encodeURIComponent(createdAt)}|${id}`;
}

export function paginate<T extends { created_at: string; id: string }>(
  rows: T[],
  limit: number
): { items: T[]; next_cursor: string | null } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? makeCursor(items[items.length - 1].created_at, items[items.length - 1].id)
    : null;
  return { items, next_cursor: nextCursor };
}
