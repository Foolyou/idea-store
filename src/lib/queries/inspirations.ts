import { db } from "../db";
import { unpackImages } from "../utils";
import { parseCursor, cursorWhere, paginate } from "./pagination";
import type { PageParams } from "./pagination";

interface RawRow {
  id: string;
  content: string;
  images: string;
  visibility: string;
  circle_id: string | null;
  author_id: string;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
  author_nickname?: string;
  author_avatar?: string | null;
  circle_name?: string | null;
  is_liked?: number;
  is_bookmarked?: number;
}

function packImages(images: string[]): string {
  return JSON.stringify(images);
}

const FEED_SELECT = `
  i.id, i.content, i.images, i.visibility, i.circle_id,
  i.like_count, i.bookmark_count, i.created_at,
  u.id as author_id, u.nickname as author_nickname, u.avatar_url as author_avatar,
  c.name as circle_name
`;

export interface InspirationFeedResult {
  id: string;
  content: string;
  images: string[];
  visibility: "public" | "circle" | "private";
  circle_id: string | null;
  circle_name: string | null;
  author: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
  like_count: number;
  bookmark_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export interface InspirationDetailResult {
  id: string;
  content: string;
  images: string[];
  visibility: "public" | "circle" | "private";
  circle_id: string | null;
  circle_name: string | null;
  author: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
  like_count: number;
  bookmark_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}

function makeFeedItem(row: RawRow, userId: string | null): InspirationFeedResult {
  return {
    id: row.id,
    content: row.content,
    images: unpackImages(row.images),
    visibility: row.visibility as "public" | "circle" | "private",
    circle_id: row.circle_id,
    circle_name: row.circle_name ?? null,
    author: {
      id: row.author_id,
      nickname: row.author_nickname ?? "",
      avatar_url: row.author_avatar ?? null,
    },
    like_count: row.like_count,
    bookmark_count: row.bookmark_count,
    is_liked: userId ? Boolean(row.is_liked) : false,
    is_bookmarked: userId ? Boolean(row.is_bookmarked) : false,
    created_at: row.created_at,
  };
}

export async function getFeed(
  userId: string | null,
  params: PageParams = {}
): Promise<{ items: InspirationFeedResult[]; next_cursor: string | null }> {
  const { limit, cursorCreated, cursorId } = parseCursor(params);
  const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId, "i");

  let joinCircles = "";
  let circleCondition = "";
  const args: (string | number | null)[] = [];

  if (userId) {
    // Logged in: public + own private + joined circle inspirations
    joinCircles = "LEFT JOIN circle_members cm ON cm.circle_id = i.circle_id AND cm.user_id = ?";
    args.push(userId);
    circleCondition = `OR (i.visibility = 'circle' AND cm.user_id IS NOT NULL) OR (i.visibility = 'private' AND i.author_id = ?)`;
    args.push(userId);
  }

  const sql = `
    SELECT ${FEED_SELECT}
    ${userId ? `, EXISTS(SELECT 1 FROM likes l WHERE l.inspiration_id = i.id AND l.user_id = ?) as is_liked` : ", 0 as is_liked"}
    ${userId ? `, EXISTS(SELECT 1 FROM bookmarks b WHERE b.inspiration_id = i.id AND b.user_id = ?) as is_bookmarked` : ", 0 as is_bookmarked"}
    FROM inspirations i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN circles c ON i.circle_id = c.id
    ${joinCircles}
    WHERE (i.visibility = 'public' ${circleCondition})
    ${cursorClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT ?
  `;

  if (userId) {
    args.push(userId, userId);
  }
  args.push(...cursorArgs, limit + 1);

  const r = await db.execute({ sql, args });
  const rows = r.rows as unknown as RawRow[];
  return paginate(rows.map((row) => makeFeedItem(row, userId)), limit);
}

export async function getMyInspirations(
  userId: string,
  params: PageParams = {}
): Promise<{ items: InspirationFeedResult[]; next_cursor: string | null }> {
  const { limit, cursorCreated, cursorId } = parseCursor(params);
  const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId, "i");

  const sql = `
    SELECT ${FEED_SELECT},
      EXISTS(SELECT 1 FROM likes l WHERE l.inspiration_id = i.id AND l.user_id = ?) as is_liked,
      EXISTS(SELECT 1 FROM bookmarks b WHERE b.inspiration_id = i.id AND b.user_id = ?) as is_bookmarked
    FROM inspirations i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN circles c ON i.circle_id = c.id
    WHERE i.author_id = ?
    ${cursorClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT ?
  `;

  const r = await db.execute({
    sql,
    args: [userId, userId, userId, ...cursorArgs, limit + 1],
  });
  const rows = r.rows as unknown as RawRow[];
  return paginate(rows.map((row) => makeFeedItem(row, userId)), limit);
}

export async function getInspirationById(
  id: string,
  userId: string | null
): Promise<InspirationDetailResult | null> {
  const sql = `
    SELECT ${FEED_SELECT}, i.updated_at, i.author_id,
      ${userId ? "EXISTS(SELECT 1 FROM likes l WHERE l.inspiration_id = i.id AND l.user_id = ?) as is_liked" : "0 as is_liked"},
      ${userId ? "EXISTS(SELECT 1 FROM bookmarks b WHERE b.inspiration_id = i.id AND b.user_id = ?) as is_bookmarked" : "0 as is_bookmarked"}
    FROM inspirations i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN circles c ON i.circle_id = c.id
    WHERE i.id = ?
  `;

  const args: (string | number | null)[] = [];
  if (userId) {
    args.push(userId, userId);
  }
  args.push(id);

  const r = await db.execute({ sql, args });
  if (r.rows.length === 0) return null;
  const row = r.rows[0] as unknown as RawRow;

  // Permission: private inspirations only visible to author
  if (row.visibility === "private" && row.author_id !== userId) {
    return null;
  }

  return {
    id: row.id,
    content: row.content,
    images: unpackImages(row.images),
    visibility: row.visibility as "public" | "circle" | "private",
    circle_id: row.circle_id,
    circle_name: row.circle_name ?? null,
    author: {
      id: row.author_id,
      nickname: row.author_nickname ?? "",
      avatar_url: row.author_avatar ?? null,
    },
    like_count: row.like_count,
    bookmark_count: row.bookmark_count,
    is_liked: userId ? Boolean(row.is_liked) : false,
    is_bookmarked: userId ? Boolean(row.is_bookmarked) : false,
    author_id: row.author_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createInspiration(
  input: { content: string; images?: string[]; visibility: string; circle_id?: string },
  authorId: string
): Promise<InspirationDetailResult> {
  const id = crypto.randomUUID();
  const images = packImages(input.images ?? []);
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO inspirations (id, content, images, visibility, circle_id, author_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.content,
      images,
      input.visibility,
      input.circle_id ?? null,
      authorId,
      now,
      now,
    ],
  });

  return (await getInspirationById(id, authorId))!;
}

export async function updateInspiration(
  id: string,
  authorId: string,
  input: { content?: string; images?: string[]; visibility?: string; circle_id?: string | null }
): Promise<InspirationDetailResult | null> {
  const existing = await getInspirationById(id, authorId);
  if (!existing) return null;
  if (existing.author_id !== authorId) return null;

  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.content !== undefined) {
    sets.push("content = ?");
    args.push(input.content);
  }
  if (input.images !== undefined) {
    sets.push("images = ?");
    args.push(packImages(input.images));
  }
  if (input.visibility !== undefined) {
    sets.push("visibility = ?");
    args.push(input.visibility);
  }
  if (input.circle_id !== undefined) {
    sets.push("circle_id = ?");
    args.push(input.circle_id);
  }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    args.push(id);
    await db.execute({
      sql: `UPDATE inspirations SET ${sets.join(", ")} WHERE id = ?`,
      args,
    });
  }

  return getInspirationById(id, authorId);
}

export async function deleteInspiration(id: string, authorId: string): Promise<boolean> {
  const existing = await getInspirationById(id, authorId);
  if (!existing) return false;
  if (existing.author_id !== authorId) return false;

  await db.execute({ sql: "DELETE FROM inspirations WHERE id = ?", args: [id] });
  return true;
}
