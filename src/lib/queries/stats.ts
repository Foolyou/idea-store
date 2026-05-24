import { db } from "../db";
import { parseCursor, cursorWhere, paginate } from "./pagination";
import type { PageParams } from "./pagination";

export interface UserStats {
  total_likes_received: number;
  total_bookmarks_received: number;
  total_inspirations: number;
  total_circles: number;
}

export interface BookmarkedItem {
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

export async function getUserStats(userId: string): Promise<UserStats> {
  const r = await db.execute({
    sql: `
      SELECT
        (SELECT COALESCE(SUM(like_count), 0) FROM inspirations WHERE author_id = ?) as total_likes_received,
        (SELECT COALESCE(SUM(bookmark_count), 0) FROM inspirations WHERE author_id = ?) as total_bookmarks_received,
        (SELECT COUNT(*) FROM inspirations WHERE author_id = ?) as total_inspirations,
        (SELECT COUNT(*) FROM circle_members WHERE user_id = ?) as total_circles
    `,
    args: [userId, userId, userId, userId],
  });

  const row = r.rows[0];
  return {
    total_likes_received: row.total_likes_received as number,
    total_bookmarks_received: row.total_bookmarks_received as number,
    total_inspirations: row.total_inspirations as number,
    total_circles: row.total_circles as number,
  };
}

export async function getMyBookmarks(
  userId: string,
  params: PageParams = {}
): Promise<{ items: BookmarkedItem[]; next_cursor: string | null }> {
  const { limit, cursorCreated, cursorId } = parseCursor(params);
  const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId, "i");

  const sql = `
    SELECT i.id, i.content, i.images, i.visibility, i.circle_id,
           i.like_count, i.bookmark_count, i.created_at,
           u.id as author_id, u.nickname as author_nickname, u.avatar_url as author_avatar,
           c.name as circle_name,
           EXISTS(SELECT 1 FROM likes l WHERE l.inspiration_id = i.id AND l.user_id = ?) as is_liked,
           1 as is_bookmarked
    FROM inspirations i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN circles c ON i.circle_id = c.id
    JOIN bookmarks b ON b.inspiration_id = i.id
    WHERE b.user_id = ?
    ${cursorClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT ?
  `;

  const r = await db.execute({
    sql,
    args: [userId, userId, ...cursorArgs, limit + 1],
  });

  const rows = r.rows as unknown as BookmarkRaw[];
  const items = rows.map((row) => ({
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
    is_liked: Boolean(row.is_liked),
    is_bookmarked: true,
    created_at: row.created_at,
  }));

  return paginate(items, limit);
}

interface BookmarkRaw {
  id: string;
  content: string;
  images: string;
  visibility: string;
  circle_id: string | null;
  like_count: number;
  bookmark_count: number;
  created_at: string;
  author_id: string;
  author_nickname: string;
  author_avatar: string | null;
  circle_name: string | null;
  is_liked: number;
  is_bookmarked: number;
}

function unpackImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
