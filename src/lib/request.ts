import { getSession } from "./auth";
import { db } from "./db";

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(error: string, status: number = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function getCurrentUser(): Promise<{
  id: string;
  nickname: string;
  avatar_url: string | null;
  last_visibility: string;
  last_circle_id: string | null;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const r = await db.execute({
    sql: `SELECT id, nickname, avatar_url, last_visibility, last_circle_id
          FROM users WHERE id = ?`,
    args: [session.userId],
  });

  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return {
    id: row.id as string,
    nickname: row.nickname as string,
    avatar_url: row.avatar_url as string | null,
    last_visibility: row.last_visibility as string,
    last_circle_id: row.last_circle_id as string | null,
  };
}

export async function requireUser(): Promise<{
  id: string;
  nickname: string;
  avatar_url: string | null;
  last_visibility: string;
  last_circle_id: string | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError();
  }
  return user;
}

// ==========================================
// 错误类
// ==========================================

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class AuthError extends AppError {
  constructor(message: string = "请先登录") {
    super(message, 401);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "无权访问") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "资源") {
    super(`${resource}不存在`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

// ==========================================
// Route Handler 错误处理包装器
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, context: any) => Promise<Response>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (e) {
      if (e instanceof AppError) {
        return jsonError(e.message, e.status);
      }
      if (e instanceof Error && e.message.includes("Turso")) {
        console.error("[DB Error]", e);
        return jsonError("数据库服务暂时不可用", 503);
      }
      console.error("[Unhandled Error]", e);
      return jsonError("服务器内部错误", 500);
    }
  };
}
