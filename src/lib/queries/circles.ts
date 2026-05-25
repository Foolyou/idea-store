import { db } from "../db";
import { unpackImages } from "../utils";
import { parseCursor, cursorWhere, paginate } from "./pagination";
import type { PageParams } from "./pagination";

const MEMBER_COUNT_SUB = "(SELECT COUNT(*) FROM circle_members cm2 WHERE cm2.circle_id = c.id)";

// ==========================================
// Circle queries
// ==========================================

export async function listCircles(
  search: string | undefined,
  userId: string | null,
  params: PageParams = {}
): Promise<{ items: CircleRow[]; next_cursor: string | null }> {
  const { limit, cursorCreated, cursorId } = parseCursor(params);
  const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId, "c");

  let searchClause = "";
  const args: (string | number | null)[] = [];

  if (search) {
    searchClause = "AND c.name LIKE ?";
    args.push(`%${search}%`);
  }

  const condJoined = userId
    ? ", EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = ?) as is_joined"
    : ", 0 as is_joined";

  const sql = `SELECT c.id, c.name, c.description, ${MEMBER_COUNT_SUB} as member_count, c.created_at,
    u.id as creator_id, u.nickname as creator_nickname, u.avatar_url as creator_avatar
    ${condJoined}
    FROM circles c
    JOIN users u ON c.creator_id = u.id
    WHERE 1=1 ${searchClause}
    ${cursorClause}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ?`;

  if (userId) args.push(userId);
  args.push(...cursorArgs, limit + 1);

  const r = await db.execute({ sql, args });
  const rows = r.rows as unknown as CircleRaw[];
  return paginate(rows.map((row) => makeCircleItem(row)), limit);
}

export async function getCircleById(
  id: string,
  userId: string | null
): Promise<CircleRow | null> {
  const condJoined = userId
    ? ", EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id = c.id AND cm.user_id = ?) as is_joined"
    : ", 0 as is_joined";

  const sql = `SELECT c.id, c.name, c.description, ${MEMBER_COUNT_SUB} as member_count, c.created_at,
    u.id as creator_id, u.nickname as creator_nickname, u.avatar_url as creator_avatar
    ${condJoined}
    FROM circles c
    JOIN users u ON c.creator_id = u.id
    WHERE c.id = ?`;

  const args: (string | number | null)[] = [];
  if (userId) args.push(userId);
  args.push(id);

  const r = await db.execute({ sql, args });
  if (r.rows.length === 0) return null;
  return makeCircleItem(r.rows[0] as unknown as CircleRaw);
}

export async function isCircleMember(circleId: string, userId: string): Promise<boolean> {
  const r = await db.execute({
    sql: "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?",
    args: [circleId, userId],
  });
  return r.rows.length > 0;
}

export async function createCircle(
  name: string,
  description: string,
  creatorId: string
): Promise<CircleRow> {
  const id = crypto.randomUUID();

  const txn = await db.transaction("write");
  try {
    await txn.execute({
      sql: "INSERT INTO circles (id, name, description, creator_id) VALUES (?, ?, ?, ?)",
      args: [id, name, description, creatorId],
    });
    await txn.execute({
      sql: "INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)",
      args: [id, creatorId],
    });
    await txn.commit();
  } catch (e) {
    await txn.rollback();
    throw e;
  }

  return (await getCircleById(id, creatorId))!;
}

export async function joinCircle(
  circleId: string,
  userId: string
): Promise<{ joined: boolean }> {
  const txn = await db.transaction("write");
  try {
    const existing = await txn.execute({
      sql: "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?",
      args: [circleId, userId],
    });
    if (existing.rows.length > 0) {
      await txn.rollback();
      return { joined: false };
    }

    await txn.execute({
      sql: "INSERT INTO circle_members (circle_id, user_id) VALUES (?, ?)",
      args: [circleId, userId],
    });
    await txn.commit();
    return { joined: true };
  } catch (e) {
    await txn.rollback();
    throw e;
  }
}

export async function leaveCircle(
  circleId: string,
  userId: string
): Promise<{ left: boolean }> {
  const txn = await db.transaction("write");
  try {
    const existing = await txn.execute({
      sql: "SELECT 1 FROM circle_members WHERE circle_id = ? AND user_id = ?",
      args: [circleId, userId],
    });
    if (existing.rows.length === 0) {
      await txn.rollback();
      return { left: false };
    }

    // Don't allow creator to leave their own circle
    const circle = await txn.execute({
      sql: "SELECT creator_id FROM circles WHERE id = ?",
      args: [circleId],
    });
    if (circle.rows.length > 0 && circle.rows[0].creator_id === userId) {
      await txn.rollback();
      return { left: false };
    }

    await txn.execute({
      sql: "DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?",
      args: [circleId, userId],
    });
    await txn.commit();
    return { left: true };
  } catch (e) {
    await txn.rollback();
    throw e;
  }
}

export async function getCircleMembers(
  circleId: string,
  params: PageParams = {}
): Promise<{ items: MemberRow[]; next_cursor: string | null }> {
  const { limit, cursorCreated, cursorId } = parseCursor(params);

  let cursorClause = "";
  const args: (string | number | null)[] = [circleId];

  if (cursorCreated && cursorId) {
    cursorClause = "AND (cm.joined_at, cm.user_id) < (?, ?)";
    args.push(cursorCreated, cursorId);
  }

  const sql = `SELECT u.id, u.nickname, u.avatar_url, cm.joined_at
    FROM circle_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.circle_id = ? ${cursorClause}
    ORDER BY cm.joined_at DESC, cm.user_id DESC
    LIMIT ?`;

  args.push(limit + 1);

  const r = await db.execute({ sql, args });
  const rows = r.rows as unknown as (MemberRaw & { created_at: string })[];
  const items = rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    joined_at: row.joined_at,
    created_at: row.joined_at,
  }));
  return paginate(items, limit);
}

export async function getCircleInspirations(
  circleId: string,
  userId: string | null,
  params: PageParams = {}
): Promise<{ items: CircleInspirationItem[]; next_cursor: string | null }> {
  // Permission: only members can see circle inspirations
  if (!userId) return { items: [], next_cursor: null };
  const isMember = await isCircleMember(circleId, userId);
  if (!isMember) return { items: [], next_cursor: null };

  const { limit, cursorCreated, cursorId } = parseCursor(params);
  const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId, "i");

  const args: (string | number | null)[] = [userId, userId];

  const sql = `SELECT i.id, i.content, i.images, i.visibility, i.circle_id,
    i.like_count, i.bookmark_count, i.created_at,
    u.id as author_id, u.nickname as author_nickname, u.avatar_url as author_avatar,
    c.name as circle_name,
    EXISTS(SELECT 1 FROM likes l WHERE l.inspiration_id = i.id AND l.user_id = ?) as is_liked,
    EXISTS(SELECT 1 FROM bookmarks b WHERE b.inspiration_id = i.id AND b.user_id = ?) as is_bookmarked
    FROM inspirations i
    JOIN users u ON i.author_id = u.id
    LEFT JOIN circles c ON i.circle_id = c.id
    WHERE i.circle_id = ?
    ${cursorClause}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT ?`;

  args.push(circleId, ...cursorArgs, limit + 1);

  const r = await db.execute({ sql, args });
  const rows = r.rows as unknown as RawInspRow[];

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
    is_bookmarked: Boolean(row.is_bookmarked),
    created_at: row.created_at,
  }));

  return paginate(items, limit);
}

export async function getMyCircles(userId: string): Promise<CircleRow[]> {
  const r = await db.execute({
    sql: `SELECT c.id, c.name, c.description, ${MEMBER_COUNT_SUB} as member_count, c.created_at,
      u.id as creator_id, u.nickname as creator_nickname, u.avatar_url as creator_avatar,
      1 as is_joined
      FROM circles c
      JOIN users u ON c.creator_id = u.id
      JOIN circle_members cm ON cm.circle_id = c.id AND cm.user_id = ?
      ORDER BY c.name ASC`,
    args: [userId],
  });
  return (r.rows as unknown as CircleRaw[]).map(makeCircleItem);
}

// ==========================================
// Helper types & functions
// ==========================================

interface CircleRaw {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
  creator_id: string;
  creator_nickname: string;
  creator_avatar: string | null;
  is_joined?: number;
}

interface MemberRaw {
  id: string;
  nickname: string;
  avatar_url: string | null;
  joined_at: string;
}

interface RawInspRow {
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
  is_liked?: number;
  is_bookmarked?: number;
}

export interface CircleRow {
  id: string;
  name: string;
  description: string;
  creator: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
  member_count: number;
  is_joined: boolean;
  created_at: string;
}

export interface MemberRow {
  id: string;
  nickname: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface CircleInspirationItem {
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

function makeCircleItem(row: CircleRaw): CircleRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    creator: {
      id: row.creator_id,
      nickname: row.creator_nickname,
      avatar_url: row.creator_avatar ?? null,
    },
    member_count: row.member_count,
    is_joined: Boolean(row.is_joined),
    created_at: row.created_at,
  };
}
