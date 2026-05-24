import { db } from "./db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 天，秒

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

  await db.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    args: [token, userId, expiresAt],
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;

  await db.execute({
    sql: "DELETE FROM sessions WHERE id = ?",
    args: [token],
  });

  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<{ userId: string; sessionId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const r = await db.execute({
    sql: `SELECT user_id, expires_at FROM sessions WHERE id = ?`,
    args: [token],
  });

  if (r.rows.length === 0) return null;

  const row = r.rows[0];
  const expiresAt = new Date(row.expires_at as string);

  if (expiresAt < new Date()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [token] });
    return null;
  }

  return { userId: row.user_id as string, sessionId: token };
}
