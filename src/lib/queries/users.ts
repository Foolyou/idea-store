import { db } from "../db";

export interface UserRow {
  id: string;
  nickname: string;
  password_hash: string;
  avatar_url: string | null;
  last_visibility: string;
  last_circle_id: string | null;
  created_at: string;
}

export async function createUser(
  nickname: string,
  passwordHash: string
): Promise<{ id: string; nickname: string; avatar_url: string | null }> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO users (id, nickname, password_hash) VALUES (?, ?, ?)",
    args: [id, nickname, passwordHash],
  });
  return { id, nickname, avatar_url: null };
}

export async function getUserByNickname(nickname: string): Promise<UserRow | null> {
  const r = await db.execute({
    sql: "SELECT * FROM users WHERE nickname = ?",
    args: [nickname],
  });
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return {
    id: row.id as string,
    nickname: row.nickname as string,
    password_hash: row.password_hash as string,
    avatar_url: row.avatar_url as string | null,
    last_visibility: row.last_visibility as string,
    last_circle_id: row.last_circle_id as string | null,
    created_at: row.created_at as string,
  };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const r = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return {
    id: row.id as string,
    nickname: row.nickname as string,
    password_hash: row.password_hash as string,
    avatar_url: row.avatar_url as string | null,
    last_visibility: row.last_visibility as string,
    last_circle_id: row.last_circle_id as string | null,
    created_at: row.created_at as string,
  };
}

export async function updateUser(
  id: string,
  fields: {
    nickname?: string;
    avatar_url?: string | null;
    password_hash?: string;
  }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | null)[] = [];

  if (fields.nickname !== undefined) {
    sets.push("nickname = ?");
    args.push(fields.nickname);
  }
  if (fields.avatar_url !== undefined) {
    sets.push("avatar_url = ?");
    args.push(fields.avatar_url);
  }
  if (fields.password_hash !== undefined) {
    sets.push("password_hash = ?");
    args.push(fields.password_hash);
  }

  if (sets.length === 0) return;

  args.push(id);
  await db.execute({
    sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function checkNicknameUnique(
  nickname: string,
  excludeId?: string
): Promise<boolean> {
  if (excludeId) {
    const r = await db.execute({
      sql: "SELECT 1 FROM users WHERE nickname = ? AND id != ?",
      args: [nickname, excludeId],
    });
    return r.rows.length === 0;
  }
  const r = await db.execute({
    sql: "SELECT 1 FROM users WHERE nickname = ?",
    args: [nickname],
  });
  return r.rows.length === 0;
}
