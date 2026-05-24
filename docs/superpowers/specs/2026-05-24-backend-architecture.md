# 灵感宝盒 — 后端架构设计

| 属性 | 信息 |
|------|------|
| 文档版本 | v1.0 |
| 发布日期 | 2026-05-24 |
| 依赖 | 开发路线图 v1.0、产品需求文档 v1.0 |

---

## 1. 技术决策总览

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 数据库查询 | 原生 SQL（`@libsql/client`） | SQLite 轻量，无需 ORM 抽象层；直接控制查询性能 |
| UUID 生成 | `crypto.randomUUID()` | Node.js 内置，无依赖，标准 UUID v4 |
| Session 管理 | 自建 session token + DB 存储 | 无 JWT 复杂度，服务端可控，支持即时失效 |
| 响应格式 | `{ ok: boolean, data?: T, error?: string }` | 前端统一处理，类型安全 |
| 分页策略 | 基于游标（cursor-based） | 支持无限滚动，避免 OFFSET 性能问题 |
| 密码加密 | bcrypt | 行业标准，抗彩虹表 |
| 中间件 | Next.js middleware.ts 仅注入用户 ID | 轻量，不做完整认证检查，路由自主控制 |

---

## 2. 目录结构

```
src/
├── lib/
│   ├── db.ts                          # Turso 客户端（已有）
│   ├── utils.ts                       # cn() 工具函数（已有）
│   ├── schema.sql                     # [S1] DDL 脚本
│   ├── migrate.ts                     # [S1] 迁移执行脚本
│   ├── auth.ts                        # [S2] session 创建/验证/销毁
│   ├── password.ts                    # [S2] bcrypt hash / verify
│   ├── request.ts                     # [S3] 统一响应工具 + 当前用户获取
│   ├── validations.ts                 # [S3] Zod schema 定义
│   ├── queries/
│   │   ├── users.ts                   # [S3] 用户查询（CRUD）
│   │   ├── inspirations.ts            # [S4] 灵感查询（CRUD + feed）
│   │   ├── circles.ts                 # [S6] 圈子查询（CRUD + 成员）
│   │   ├── interactions.ts            # [S7] 点赞/收藏查询
│   │   └── stats.ts                   # [S7] 统计查询
│   └── types.ts                       # [S2] 共享 TypeScript 类型
├── middleware.ts                       # [S2] Session cookie 注入
├── hooks/
│   ├── use-draft.ts                   # [S5] 草稿 hook
│   └── ...
└── app/
    ├── layout.tsx                      # 已有
    ├── page.tsx                        # [S8] 首页
    ├── globals.css                     # 已有
    ├── api/
    │   ├── auth/
    │   │   ├── register/route.ts       # [S3] POST 注册
    │   │   ├── login/route.ts          # [S3] POST 登录
    │   │   ├── logout/route.ts         # [S3] POST 登出
    │   │   └── me/route.ts            # [S3] GET 当前用户
    │   ├── inspirations/
    │   │   ├── route.ts                # [S4] GET 列表 + POST 创建
    │   │   └── [id]/
    │   │       ├── route.ts            # [S4] GET/PATCH/DELETE 单个灵感
    │   │       ├── like/route.ts       # [S7] POST 切换点赞
    │   │       └── bookmark/route.ts   # [S7] POST 切换收藏
    │   ├── circles/
    │   │   ├── route.ts                # [S6] GET 列表 + POST 创建
    │   │   └── [id]/
    │   │       ├── route.ts            # [S6] GET 详情
    │   │       ├── join/route.ts       # [S6] POST 加入
    │   │       ├── members/route.ts    # [S6] GET 成员列表
    │   │       └── inspirations/route.ts # [S6] GET 圈子灵感流
    │   ├── me/
    │   │   ├── inspirations/route.ts   # [S4] GET 我的灵感
    │   │   ├── circles/route.ts        # [S6] GET 我的圈子
    │   │   ├── bookmarks/route.ts      # [S7] GET 我的收藏
    │   │   ├── stats/route.ts          # [S7] GET 我的统计
    │   │   └── settings/route.ts       # [S3] PATCH 更新设置
    │   ├── uploadthing/
    │   │   ├── core.ts                 # [S4] UploadThing 配置
    │   │   └── route.ts               # [S4] UploadThing 路由
    │   ├── test-db/route.ts           # 已有（开发用）
    │   └── test-uploadthing/route.ts  # 已有（开发用）
    ├── idea/
    │   └── [id]/page.tsx              # [S8] 灵感详情页
    ├── circle/
    │   └── [id]/page.tsx              # [S8] 圈子主页
    ├── circles/page.tsx               # [S8] 圈子发现页
    └── me/page.tsx                    # [S8] 个人中心
```

---

## 3. 数据库 Schema

### 3.1 完整 DDL

```sql
-- ============================================================
-- S1: 核心表
-- ============================================================

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  nickname        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  avatar_url      TEXT,
  last_visibility TEXT NOT NULL DEFAULT 'public' CHECK (last_visibility IN ('public', 'circle', 'private')),
  last_circle_id  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (last_circle_id) REFERENCES circles(id) ON DELETE SET NULL
);

CREATE TABLE inspirations (
  id             TEXT PRIMARY KEY,
  content        TEXT NOT NULL,
  images         TEXT NOT NULL DEFAULT '[]',
  visibility     TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'circle', 'private')),
  circle_id      TEXT,
  author_id      TEXT NOT NULL,
  like_count     INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE SET NULL
);

CREATE TABLE circles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  creator_id   TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE circle_members (
  circle_id TEXT NOT NULL,
  user_id   TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (circle_id, user_id),
  FOREIGN KEY (circle_id) REFERENCES circles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE likes (
  user_id        TEXT NOT NULL,
  inspiration_id TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, inspiration_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (inspiration_id) REFERENCES inspirations(id) ON DELETE CASCADE
);

CREATE TABLE bookmarks (
  user_id        TEXT NOT NULL,
  inspiration_id TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, inspiration_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (inspiration_id) REFERENCES inspirations(id) ON DELETE CASCADE
);

-- ============================================================
-- S2: Session 表
-- ============================================================

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- 索引
-- ============================================================

-- 灵感流：按时间倒序查询公开 + 圈子内容
CREATE INDEX idx_inspirations_visibility_created
  ON inspirations(visibility, created_at DESC);

-- 灵感流：按作者查询（我的灵感）
CREATE INDEX idx_inspirations_author_created
  ON inspirations(author_id, created_at DESC);

-- 灵感流：按圈子查询
CREATE INDEX idx_inspirations_circle_created
  ON inspirations(circle_id, created_at DESC);

-- 灵感流：游标分页复合索引
CREATE INDEX idx_inspirations_feed_cursor
  ON inspirations(visibility, created_at DESC, id);

-- Session 查询加速
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Session 过期清理
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 圈子搜索
CREATE INDEX idx_circles_name ON circles(name);

-- 圈子成员查询
CREATE INDEX idx_circle_members_user ON circle_members(user_id);
```

### 3.2 设计说明

| 决策 | 说明 |
|------|------|
| `images` 为 TEXT | Turso SQLite 无原生数组类型，存 JSON 字符串 `'["url1","url2"]'` |
| `like_count` / `bookmark_count` 冗余 | 写入时事务同步更新计数，避免每次查询 COUNT JOIN |
| `member_count` 冗余 | 同上，避免 COUNT 查询 |
| `datetime('now')` | 使用 Turso 服务器时间，确保一致性 |
| `CHECK` 约束 | 枚举值限制在数据库层面 |
| `ON DELETE CASCADE` | 用户删除时自动清理关联数据；圈子删除时保留灵感但 `circle_id` 置 NULL |
| 复合主键 | `likes` / `bookmarks` / `circle_members` 使用联合主键，天然去重 |

---

## 4. API 路由树

### 4.1 通用规范

**响应格式：**

```typescript
// 成功
{ ok: true, data: T }

// 失败
{ ok: false, error: "错误描述" }
```

**认证说明：**
- 标记为 `🔒` 的端点需要登录
- 标记为 `🔓` 的端点公开访问
- 标记为 `⛓` 的端点根据登录态返回不同内容

### 4.2 认证模块 — S3

#### `POST /api/auth/register` 🔓

```typescript
// Request Body
{
  nickname: string;   // 2-20 字符，唯一
  password: string;   // 6-100 字符
}

// Response 201
{
  ok: true,
  data: {
    user: { id: string; nickname: string; avatar_url: string | null };
  }
}

// Response 409 (昵称已存在)
{ ok: false, error: "该昵称已被使用" }

// Response 400 (校验失败)
{ ok: false, error: "昵称长度为 2-20 个字符" }
```

#### `POST /api/auth/login` 🔓

```typescript
// Request Body
{ nickname: string; password: string; }

// Response 200
{
  ok: true,
  data: {
    user: { id: string; nickname: string; avatar_url: string | null };
  }
}
// Set-Cookie: session=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800

// Response 401
{ ok: false, error: "昵称或密码错误" }
```

#### `POST /api/auth/logout` 🔒

```typescript
// No body
// Response 200
{ ok: true }
// Set-Cookie: session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0
```

#### `GET /api/auth/me` ⛓

```typescript
// 已登录 Response 200
{
  ok: true,
  data: {
    user: {
      id: string;
      nickname: string;
      avatar_url: string | null;
      last_visibility: "public" | "circle" | "private";
      last_circle_id: string | null;
      created_at: string;
    }
  }
}

// 未登录 Response 200
{ ok: true, data: { user: null } }
```

### 4.3 灵感模块 — S4

#### `GET /api/inspirations` ⛓

社区流：公开灵感 + 用户已加入圈子的灵感

```typescript
// Query Params
{
  cursor?: string;    // 游标，格式: "<created_at>|<id>"
  limit?: number;     // 默认 20，最大 50
}

// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string;
      content: string;
      images: string[];
      visibility: "public" | "circle";
      circle_id: string | null;
      circle_name: string | null;       // 圈子名（如果是圈子灵感）
      author: {
        id: string;
        nickname: string;
        avatar_url: string | null;
      };
      like_count: number;
      bookmark_count: number;
      is_liked: boolean;                // 登录后才有意义
      is_bookmarked: boolean;           // 登录后才有意义
      created_at: string;
    }>;
    next_cursor: string | null;         // 下一页游标，null 表示没有更多
  }
}
```

#### `POST /api/inspirations` 🔒

```typescript
// Request Body
{
  content: string;                                  // 1-5000 字符
  images?: string[];                                // 最多 9 个 URL
  visibility: "public" | "circle" | "private";
  circle_id?: string;                               // visibility=circle 时必填
}

// Response 201
{
  ok: true,
  data: {
    id: string;
    content: string;
    images: string[];
    visibility: "public" | "circle" | "private";
    author: { id: string; nickname: string; avatar_url: string | null };
    like_count: 0;
    bookmark_count: 0;
    created_at: string;
  }
}
```

#### `GET /api/inspirations/[id]` ⛓

```typescript
// Response 200
{
  ok: true,
  data: {
    id: string;
    content: string;
    images: string[];
    visibility: "public" | "circle" | "private";
    circle_id: string | null;
    circle_name: string | null;
    author: { id: string; nickname: string; avatar_url: string | null };
    like_count: number;
    bookmark_count: number;
    is_liked: boolean;
    is_bookmarked: boolean;
    created_at: string;
    updated_at: string;
  }
}

// Response 404
{ ok: false, error: "灵感不存在" }

// Response 403 (私有灵感且非作者)
{ ok: false, error: "无权访问" }
```

#### `PATCH /api/inspirations/[id]` 🔒

```typescript
// Request Body (全部可选)
{
  content?: string;
  images?: string[];
  visibility?: "public" | "circle" | "private";
  circle_id?: string | null;
}

// Response 200 — 返回更新后的完整灵感对象

// Response 403 — 非作者
{ ok: false, error: "无权编辑" }
```

#### `DELETE /api/inspirations/[id]` 🔒

```typescript
// Response 200
{ ok: true }

// Response 403 — 非作者
{ ok: false, error: "无权删除" }
```

### 4.4 我的数据 — S4 / S7

#### `GET /api/me/inspirations` 🔒

```typescript
// Query: { cursor?: string; limit?: number }
// Response 200 — 与 GET /api/inspirations 相同结构，但仅包含当前用户的灵感（包含 private）
```

#### `GET /api/me/bookmarks` 🔒

```typescript
// Query: { cursor?: string; limit?: number }
// Response 200 — 与灵感列表结构相同，但仅包含已收藏的灵感
```

#### `GET /api/me/stats` 🔒

```typescript
// Response 200
{
  ok: true,
  data: {
    total_likes_received: number;      // 所有灵感获赞总和
    total_bookmarks_received: number;  // 所有灵感收藏总和
    total_inspirations: number;        // 灵感总数
    total_circles: number;             // 加入的圈子数
  }
}
```

### 4.5 用户设置 — S3

#### `PATCH /api/me/settings` 🔒

```typescript
// Request Body (全部可选，至少传一个)
{
  nickname?: string;        // 2-20 字符
  avatar_url?: string;      // 头像 URL
  password?: {              // 改密码时需同时提供
    old: string;
    new: string;            // 6-100 字符
  };
}

// Response 200
{ ok: true, data: { user: { id, nickname, avatar_url, ... } } }

// Response 409 (昵称冲突)
{ ok: false, error: "该昵称已被使用" }

// Response 400 (旧密码错误)
{ ok: false, error: "原密码不正确" }
```

### 4.6 圈子模块 — S6

#### `GET /api/circles` 🔓

```typescript
// Query: { search?: string; cursor?: string; limit?: number }

// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string;
      name: string;
      description: string;
      creator: { id: string; nickname: string; avatar_url: string | null };
      member_count: number;
      is_joined: boolean;              // 登录后有效
      created_at: string;
    }>;
    next_cursor: string | null;
  }
}
```

#### `POST /api/circles` 🔒

```typescript
// Request Body
{
  name: string;           // 1-30 字符，唯一
  description?: string;   // 0-200 字符
}

// Response 201
{ ok: true, data: { id, name, description, ... } }

// Response 409
{ ok: false, error: "该圈子名已存在" }
```

#### `GET /api/circles/[id]` ⛓

```typescript
// Response 200
{
  ok: true,
  data: {
    id: string;
    name: string;
    description: string;
    creator: { id: string; nickname: string; avatar_url: string | null };
    member_count: number;
    is_joined: boolean;
    created_at: string;
  }
}
```

#### `POST /api/circles/[id]/join` 🔒

```typescript
// Response 200
{ ok: true, data: { joined: true } }

// Response 409
{ ok: false, error: "已经是圈子成员" }
```

#### `GET /api/circles/[id]/members` 🔓

```typescript
// Query: { cursor?: string; limit?: number }

// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string;
      nickname: string;
      avatar_url: string | null;
      joined_at: string;
    }>;
    next_cursor: string | null;
  }
}
```

#### `GET /api/circles/[id]/inspirations` ⛓

```typescript
// Query: { cursor?: string; limit?: number }
// Response 200 — 标准灵感列表，仅返回该圈子的灵感
// 未登录或非成员查看时仅返回公开灵感
```

### 4.7 互动模块 — S7

#### `POST /api/inspirations/[id]/like` 🔒

```typescript
// Request Body (可选，空 body 即可)
{}

// Response 200
{
  ok: true,
  data: {
    liked: boolean;       // true=已点赞, false=已取消
    like_count: number;   // 最新点赞数
  }
}
```

#### `POST /api/inspirations/[id]/bookmark` 🔒

```typescript
// Response 200
{
  ok: true,
  data: {
    bookmarked: boolean;
    bookmark_count: number;
  }
}
```

### 4.8 上传模块 — S4

#### `POST /api/uploadthing` 🔒

由 UploadThing SDK 内部处理，不手动编写路由逻辑。仅需配置 `core.ts` 中的 File Router。

---

## 5. 认证设计

### 5.1 整体流程

```
注册: 昵称+密码 → bcrypt hash → INSERT users → 生成 session token → Set-Cookie
登录: 昵称+密码 → bcrypt verify → 生成 session token → Set-Cookie
请求: Cookie(session=xxx) → middleware 查 sessions 表 → 注入 x-user-id header → route handler 读取
登出: 清除 Cookie + DELETE sessions 记录
```

### 5.2 Session Token 设计

```typescript
// src/lib/auth.ts

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
    // 过期清理
    await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [token] });
    return null;
  }

  return { userId: row.user_id as string, sessionId: token };
}
```

### 5.3 密码加密

```typescript
// src/lib/password.ts

import { hash, compare } from "bcrypt";

// bcrypt 的 Node.js 实现在 Next.js 中通过 import 即可使用
// 如果运行时报错，需 npm install bcrypt
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}
```

注意：Next.js 15 的 Edge Runtime 不支持 bcrypt 的原生模块。所有认证路由必须使用 Node.js runtime：

```typescript
// 在每个需要 bcrypt 的 route.ts 顶部
export const runtime = "nodejs";
```

### 5.4 Middleware

```typescript
// src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;
  let userId: string | null = null;

  if (sessionToken) {
    // 在 middleware 中无法直接使用 Turso（Edge Runtime 限制），
    // 因此 middleware 仅透传 token，由各 route handler 自行验证。
    // 可选方案：使用 Turso HTTP API 做轻量验证
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-token", sessionToken);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
```

**设计说明：** Next.js middleware 默认在 Edge Runtime 运行，`@libsql/client` 不完全兼容 Edge。因此 middleware 仅做 token 透传（将 cookie 值放入 `x-session-token` header），实际的 session 验证、数据库查询由各 route handler 在 Node.js runtime 中完成。

### 5.5 获取当前用户（Route Handler 中）

```typescript
// src/lib/request.ts

import { getSession } from "./auth";
import { db } from "./db";

export type ApiResponse<T = void> = Response;

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function jsonError(error: string, status: number = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

// 获取当前登录用户，未登录返回 null
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
  return r.rows[0] as unknown as any;
}

// 要求登录，否则返回 401
export async function requireUser(): Promise<{
  id: string;
  nickname: string;
  avatar_url: string | null;
  last_visibility: string;
  last_circle_id: string | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    // 注意：这里抛出 Response 对象，需要在调用方用 try-catch 或在路由中直接 return
    throw jsonError("请先登录", 401);
  }
  return user;
}
```

---

## 6. 数据访问层

### 6.1 组织方式

所有数据库操作集中在 `src/lib/queries/` 目录，每个文件导出纯函数。不使用 ORM，直接写 SQL。

```typescript
// src/lib/queries/inspirations.ts 示例

import { db } from "../db";

export interface InspirationRow {
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
}

export interface InspirationFeedItem {
  /* ... 与 API 响应一致的类型 */
}

const FEED_SELECT = `
  SELECT i.*, u.nickname as author_nickname, u.avatar_url as author_avatar,
         c.name as circle_name
  FROM inspirations i
  JOIN users u ON i.author_id = u.id
  LEFT JOIN circles c ON i.circle_id = c.id
`;

export async function getFeed(
  userId: string | null,
  cursor?: string,
  limit: number = 20
): Promise<{ items: InspirationFeedItem[]; nextCursor: string | null }> {
  // 构建可见性条件：公开 或 (圈子 且 当前用户是该圈子成员)
  // 游标解析：created_at|<id>
  // ...
}
```

### 6.2 游标分页模式

```typescript
// src/lib/queries/pagination.ts

export interface PageParams {
  cursor?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function parsePagination(params: PageParams) {
  const limit = Math.min(Math.max(1, params.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  let cursorCreated: string | null = null;
  let cursorId: string | null = null;

  if (params.cursor) {
    const parts = params.cursor.split("|");
    if (parts.length === 2) {
      cursorCreated = decodeURIComponent(parts[0]);
      cursorId = parts[1];
    }
  }

  return { limit, cursorCreated, cursorId };
}

export function buildCursorClause(
  cursorCreated: string | null,
  cursorId: string | null,
  tableAlias: string = "i"
): { sql: string; args: string[] } {
  if (!cursorCreated || !cursorId) {
    return { sql: "", args: [] };
  }
  return {
    sql: `AND (${tableAlias}.created_at, ${tableAlias}.id) < (?, ?)`,
    args: [cursorCreated, cursorId],
  };
}

export function encodeCursor(createdAt: string, id: string): string {
  return `${encodeURIComponent(createdAt)}|${id}`;
}
```

**游标查询示例：**

```sql
-- 首页 Feed（第一页）
SELECT i.*, ...
FROM inspirations i
WHERE visibility = 'public'
   OR (visibility = 'circle' AND circle_id IN (?))  -- 用户加入的圈子
ORDER BY i.created_at DESC, i.id DESC
LIMIT 21;

-- 首页 Feed（翻页，游标为 "2026-05-24T10:00:00|abc123"）
SELECT i.*, ...
FROM inspirations i
WHERE (visibility = 'public' OR (visibility = 'circle' AND circle_id IN (?)))
  AND (i.created_at, i.id) < ('2026-05-24T10:00:00', 'abc123')
ORDER BY i.created_at DESC, i.id DESC
LIMIT 21; -- 查 21 条判断是否有下一页

-- next_cursor = 最后一条的 encodeCursor(created_at, id)
-- has_more = items.length > limit
```

### 6.3 事务模式 — 点赞/收藏

```typescript
// src/lib/queries/interactions.ts

export async function toggleLike(
  userId: string,
  inspirationId: string
): Promise<{ liked: boolean; count: number }> {
  const txn = await db.transaction("write");

  try {
    // 检查是否已点赞
    const existing = await txn.execute({
      sql: "SELECT 1 FROM likes WHERE user_id = ? AND inspiration_id = ?",
      args: [userId, inspirationId],
    });

    if (existing.rows.length > 0) {
      // 取消点赞
      await txn.execute({
        sql: "DELETE FROM likes WHERE user_id = ? AND inspiration_id = ?",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET like_count = MAX(0, like_count - 1) WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT like_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { liked: false, count: r.rows[0].like_count as number };
    } else {
      // 点赞
      await txn.execute({
        sql: "INSERT INTO likes (user_id, inspiration_id) VALUES (?, ?)",
        args: [userId, inspirationId],
      });
      await txn.execute({
        sql: "UPDATE inspirations SET like_count = like_count + 1 WHERE id = ?",
        args: [inspirationId],
      });
      const r = await txn.execute({
        sql: "SELECT like_count FROM inspirations WHERE id = ?",
        args: [inspirationId],
      });
      await txn.commit();
      return { liked: true, count: r.rows[0].like_count as number };
    }
  } catch (e) {
    await txn.rollback();
    throw e;
  }
}
```

### 6.4 UUID 生成

```typescript
// 统一放在各 query 函数中直接调用
const id = crypto.randomUUID();
// 无需包装，Node.js 18+ 原生支持
```

---

## 7. UploadThing 集成

### 7.1 依赖安装

```bash
npm install uploadthing @uploadthing/react
```

### 7.2 File Router 配置

```typescript
// src/app/api/uploadthing/core.ts

import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "10MB",
      maxFileCount: 9,
    },
  })
    .middleware(async ({ req }) => {
      // 从 cookie 获取 session token 验证登录
      const sessionToken = req.cookies.get("session")?.value;
      if (!sessionToken) throw new Error("Unauthorized");

      // 验证 session（需要在这里访问 DB）
      // 简单起见，我们允许已登录用户上传，具体验证由 route handler 负责
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      // file.url 即为上传后的图片 URL
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

```typescript
// src/app/api/uploadthing/route.ts

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

### 7.3 图片存储流程

```
客户端:
  1. 用户在发布区选择图片
  2. 调用 UploadThing 前端 SDK: uploadFiles("imageUploader", files)
  3. UploadThing 返回 [{ url: "https://xxx.ufs.sh/..." }, ...]

服务端:
  4. 客户端将上传后得到的 URL 数组传入 POST /api/inspirations
  5. 服务端将 images JSON 数组序列化为字符串存入 DB:
     JSON.stringify(imageUrls) → '["url1","url2"]'
  6. 读取时反序列化:
     JSON.parse(row.images as string) → ["url1", "url2"]
```

### 7.4 图片 URL 存储辅助函数

```typescript
// src/lib/queries/inspirations.ts

function packImages(images: string[]): string {
  return JSON.stringify(images);
}

function unpackImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

---

## 8. 错误处理

### 8.1 统一错误响应

```typescript
// src/lib/request.ts (追加)

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
```

### 8.2 Route Handler 错误处理包装器

```typescript
// src/lib/request.ts (追加)

type Handler = (req: Request, context: any) => Promise<Response>;

export function withErrorHandler(handler: Handler): Handler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (e) {
      if (e instanceof AppError) {
        return jsonError(e.message, e.status);
      }
      // Turso 连接错误
      if (e instanceof Error && e.message.includes("Turso")) {
        console.error("[DB Error]", e);
        return jsonError("数据库服务暂时不可用", 503);
      }
      // 未知错误
      console.error("[Unhandled Error]", e);
      return jsonError("服务器内部错误", 500);
    }
  };
}
```

### 8.3 Route Handler 使用模式

```typescript
// src/app/api/inspirations/[id]/route.ts

import { withErrorHandler, jsonOk, jsonError, getCurrentUser, NotFoundError, ForbiddenError } from "@/lib/request";

export const GET = withErrorHandler(async (req, { params }) => {
  const { id } = await params;
  const user = await getCurrentUser();

  const inspiration = await getInspirationById(id, user?.id);
  if (!inspiration) throw new NotFoundError("灵感");

  // 权限检查
  if (inspiration.visibility === "private" && inspiration.author_id !== user?.id) {
    throw new ForbiddenError();
  }

  return jsonOk(inspiration);
});
```

### 8.4 错误码速查

| HTTP 状态码 | 场景 |
|-------------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数校验失败、格式错误 |
| 401 | 未登录 |
| 403 | 无权操作（非作者编辑他人内容） |
| 404 | 资源不存在 |
| 409 | 冲突（昵称/圈子名已存在、重复加入） |
| 413 | 图片超过大小限制 |
| 422 | 语义错误（如 visibility=circle 但无 circle_id） |
| 500 | 服务器内部错误 |
| 503 | 数据库/外部服务不可用 |

---

## 9. TypeScript 类型定义

```typescript
// src/lib/types.ts

// ==========================================
// API 响应
// ==========================================

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T = void> = ApiOk<T> | ApiError;

// ==========================================
// 分页
// ==========================================

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

// ==========================================
// 用户
// ==========================================

export interface UserPublic {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface UserMe extends UserPublic {
  last_visibility: "public" | "circle" | "private";
  last_circle_id: string | null;
  created_at: string;
}

// ==========================================
// 灵感
// ==========================================

export type Visibility = "public" | "circle" | "private";

export interface InspirationFeedItem {
  id: string;
  content: string;
  images: string[];
  visibility: "public" | "circle";
  circle_id: string | null;
  circle_name: string | null;
  author: UserPublic;
  like_count: number;
  bookmark_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export interface InspirationDetail extends InspirationFeedItem {
  visibility: Visibility; // 详情页可能看到 private
  updated_at: string;
}

export interface CreateInspirationInput {
  content: string;
  images?: string[];
  visibility: Visibility;
  circle_id?: string;
}

export interface UpdateInspirationInput {
  content?: string;
  images?: string[];
  visibility?: Visibility;
  circle_id?: string | null;
}

// ==========================================
// 圈子
// ==========================================

export interface CircleItem {
  id: string;
  name: string;
  description: string;
  creator: UserPublic;
  member_count: number;
  is_joined: boolean;
  created_at: string;
}

export interface CreateCircleInput {
  name: string;
  description?: string;
}

// ==========================================
// 认证
// ==========================================

export interface AuthRegisterInput {
  nickname: string;
  password: string;
}

export interface AuthLoginInput {
  nickname: string;
  password: string;
}

// ==========================================
// 互动
// ==========================================

export interface ToggleResult {
  liked?: boolean;
  bookmarked?: boolean;
  like_count?: number;
  bookmark_count?: number;
}

// ==========================================
// 统计
// ==========================================

export interface UserStats {
  total_likes_received: number;
  total_bookmarks_received: number;
  total_inspirations: number;
  total_circles: number;
}

// ==========================================
// 设置
// ==========================================

export interface UpdateSettingsInput {
  nickname?: string;
  avatar_url?: string;
  password?: {
    old: string;
    new: string;
  };
}
```

---

## 10. 环境变量

```bash
# .env.local（本地开发）
TURSO_DATABASE_URL=libsql://idea-store-foolyou.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=<token>
UPLOADTHING_TOKEN=<token>
UPLOADTHING_APP_ID=<app-id>
```

Vercel 环境变量已在生产环境配置完毕，无需额外操作。

---

## 11. 实施顺序

### S1: 数据库 Schema

**文件：**
- `src/lib/schema.sql` — 新建，完整 DDL + 索引
- `src/lib/migrate.ts` — 新建，读取 schema.sql 并执行
- `src/lib/db.ts` — 无需修改（已存在）

**步骤：**
1. 将 DDL 写入 `schema.sql`
2. 编写 `migrate.ts`，读取文件并用 `db.execute()` 执行每条语句
3. 本地执行 `npx tsx src/lib/migrate.ts` 创建全部表
4. 使用 `wrangler` 或 Turso CLI 验证表结构

**验收：**
- [ ] 7 张表创建成功（含 sessions）
- [ ] 8 个索引创建成功
- [ ] 插入测试数据可正常查询
- [ ] 外键约束生效（尝试插入无效引用应报错）

---

### S2: 认证基础设施

**文件：**
- `src/lib/types.ts` — 新建，共享类型
- `src/lib/password.ts` — 新建
- `src/lib/auth.ts` — 新建
- `src/lib/request.ts` — 新建，响应工具 + 用户获取
- `src/middleware.ts` — 新建

**依赖：** `npm install bcrypt && npm install -D @types/bcrypt`

**步骤：**
1. 安装 bcrypt
2. 创建 `types.ts`
3. 创建 `password.ts`，实现 `hashPassword` / `verifyPassword`
4. 创建 `auth.ts`，实现 `createSession` / `destroySession` / `getSession`
5. 创建 `request.ts`，实现 `jsonOk` / `jsonError` / `getCurrentUser` / `requireUser` / 错误类 / `withErrorHandler`
6. 创建 `middleware.ts`，透传 session token

**验收：**
- [ ] `hashPassword("test")` 返回 60 字符 bcrypt hash
- [ ] `verifyPassword` 可正确验证
- [ ] `createSession` 向 sessions 表插入记录并设置 cookie
- [ ] `getSession` 正确返回 userId 或 null
- [ ] TypeScript 编译无错误

---

### S3: 用户系统

**文件：**
- `src/lib/queries/users.ts` — 新建
- `src/lib/validations.ts` — 新建，Zod schema
- `src/app/api/auth/register/route.ts` — 新建
- `src/app/api/auth/login/route.ts` — 新建
- `src/app/api/auth/logout/route.ts` — 新建
- `src/app/api/auth/me/route.ts` — 新建
- `src/app/api/me/settings/route.ts` — 新建

**依赖：** `npm install zod`

**步骤：**
1. 安装 zod
2. 创建 `validations.ts`，定义所有 Zod schema
3. 创建 `queries/users.ts`：
   - `createUser(nickname, passwordHash)`
   - `getUserByNickname(nickname)`
   - `getUserById(id)`
   - `updateUser(id, fields)`
   - `checkNicknameUnique(nickname, excludeId?)`
4. 实现 5 个 API 路由

**验收：**
- [ ] 注册 API 返回用户信息 + 设置 session cookie
- [ ] 重复昵称注册返回 409
- [ ] 昵称 < 2 字符或 > 20 字符返回 400
- [ ] 登录成功返回用户信息 + cookie
- [ ] 密码错误返回 401
- [ ] `/auth/me` 已登录返回用户信息
- [ ] `/auth/me` 未登录返回 `{ user: null }`
- [ ] `/me/settings` 修改昵称后新昵称生效
- [ ] 修改密码后旧密码失效、新密码可登录

---

### S4: 灵感 CRUD + 上传

**文件：**
- `src/lib/queries/inspirations.ts` — 新建
- `src/app/api/inspirations/route.ts` — 新建
- `src/app/api/inspirations/[id]/route.ts` — 新建
- `src/app/api/me/inspirations/route.ts` — 新建
- `src/app/api/uploadthing/core.ts` — 新建
- `src/app/api/uploadthing/route.ts` — 新建

**依赖：** `npm install @uploadthing/react`

**步骤：**
1. 创建 `queries/inspirations.ts`：
   - `getFeed(userId, cursor, limit)` — 社区流
   - `getMyInspirations(userId, cursor, limit)` — 我的灵感
   - `getInspirationById(id, userId?)` — 详情（含权限判断）
   - `createInspiration(input, authorId)` — 创建
   - `updateInspiration(id, authorId, input)` — 编辑（权限校验）
   - `deleteInspiration(id, authorId)` — 删除（权限校验）
2. 实现 4 个 API 路由
3. 配置 UploadThing core + route

**验收：**
- [ ] POST 创建灵感后 GET 列表可查询到
- [ ] 三种可见范围正确隔离
- [ ] 图片上传后返回 URL，存入 DB 后可读取
- [ ] 编辑后内容更新
- [ ] 删除后列表不再出现
- [ ] 分页游标正常工作
- [ ] 非作者无法编辑/删除

---

### S5: 草稿（纯客户端）

**文件：**
- `src/lib/draft.ts` — 新建
- `src/hooks/use-draft.ts` — 新建

**说明：** 草稿功能完全基于 localStorage，不涉及后端。此处列出以保证完整性。

**验收：**
- [ ] 输入文字后刷新页面，草稿恢复
- [ ] 发布成功后草稿清空
- [ ] 配置（范围、圈子）发布后保留为新默认值

---

### S6: 圈子

**文件：**
- `src/lib/queries/circles.ts` — 新建
- `src/app/api/circles/route.ts` — 新建
- `src/app/api/circles/[id]/route.ts` — 新建
- `src/app/api/circles/[id]/join/route.ts` — 新建
- `src/app/api/circles/[id]/members/route.ts` — 新建
- `src/app/api/circles/[id]/inspirations/route.ts` — 新建
- `src/app/api/me/circles/route.ts` — 新建

**步骤：**
1. 创建 `queries/circles.ts`：
   - `listCircles(search?, cursor?, limit?, userId?)` — 圈子列表（含 is_joined）
   - `getCircleById(id, userId?)` — 圈子详情
   - `createCircle(name, description, creatorId)` — 创建（创建者自动成为成员）
   - `joinCircle(circleId, userId)` — 加入（原子操作 + 更新 member_count）
   - `getCircleMembers(circleId, cursor?, limit?)` — 成员列表
   - `getCircleInspirations(circleId, cursor?, limit?)` — 圈子灵感流
   - `getMyCircles(userId)` — 我加入的圈子
2. 实现 7 个 API 路由

**验收：**
- [ ] 创建圈子后出现在圈子列表
- [ ] 圈子名重复返回 409
- [ ] 加入后 member_count +1，重复加入返回 409
- [ ] 成员列表正确展示
- [ ] 圈子灵感流仅包含该圈子的灵感
- [ ] `/me/circles` 返回当前用户加入的圈子

---

### S7: 互动

**文件：**
- `src/lib/queries/interactions.ts` — 新建
- `src/lib/queries/stats.ts` — 新建
- `src/app/api/inspirations/[id]/like/route.ts` — 新建
- `src/app/api/inspirations/[id]/bookmark/route.ts` — 新建
- `src/app/api/me/bookmarks/route.ts` — 新建
- `src/app/api/me/stats/route.ts` — 新建

**步骤：**
1. 创建 `queries/interactions.ts`：
   - `toggleLike(userId, inspirationId)` — 事务内切换
   - `toggleBookmark(userId, inspirationId)` — 事务内切换
2. 创建 `queries/stats.ts`：
   - `getUserStats(userId)` — 汇总统计
   - `getMyBookmarks(userId, cursor?, limit?)` — 收藏列表
3. 实现 4 个 API 路由

**验收：**
- [ ] 点赞后 like_count +1，再次点击 -1
- [ ] 同一用户同一灵感不重复计数
- [ ] 收藏/取消收藏双向切换正常
- [ ] 统计数字正确汇总所有灵感的赞和收藏
- [ ] 收藏列表正确分页

---

## 附录 A: Zod Schema 定义

```typescript
// src/lib/validations.ts

import { z } from "zod";

export const registerSchema = z.object({
  nickname: z
    .string()
    .min(2, "昵称至少 2 个字符")
    .max(20, "昵称最多 20 个字符")
    .trim(),
  password: z
    .string()
    .min(6, "密码至少 6 个字符")
    .max(100, "密码最多 100 个字符"),
});

export const loginSchema = registerSchema;

export const createInspirationSchema = z.object({
  content: z
    .string()
    .min(1, "内容不能为空")
    .max(5000, "内容最多 5000 个字符"),
  images: z.array(z.string().url()).max(9, "最多 9 张图片").optional().default([]),
  visibility: z.enum(["public", "circle", "private"]),
  circle_id: z.string().uuid().optional(),
}).refine(
  (data) => data.visibility !== "circle" || data.circle_id,
  { message: "选择圈子可见范围时，必须指定目标圈子", path: ["circle_id"] }
);

export const updateInspirationSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  images: z.array(z.string().url()).max(9).optional(),
  visibility: z.enum(["public", "circle", "private"]).optional(),
  circle_id: z.string().uuid().nullable().optional(),
});

export const createCircleSchema = z.object({
  name: z
    .string()
    .min(1, "圈子名不能为空")
    .max(30, "圈子名最多 30 个字符")
    .trim(),
  description: z
    .string()
    .max(200, "简介最多 200 个字符")
    .optional()
    .default(""),
});

export const updateSettingsSchema = z.object({
  nickname: z.string().min(2).max(20).trim().optional(),
  avatar_url: z.string().url().nullable().optional(),
  password: z.object({
    old: z.string().min(1),
    new: z.string().min(6).max(100),
  }).optional(),
}).refine(
  (data) => data.nickname || data.avatar_url !== undefined || data.password,
  { message: "至少需要修改一项" }
);

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().max(50).optional(),
});
```

## 附录 B: 游标分页完整实现

```typescript
// src/lib/queries/pagination.ts

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
```

使用方式：

```typescript
// 查询时始终多查 1 条以判断是否有下一页
const { limit, cursorCreated, cursorId } = parseCursor(params);
const { clause: cursorClause, args: cursorArgs } = cursorWhere(cursorCreated, cursorId);

const result = await db.execute({
  sql: `
    SELECT * FROM inspirations
    WHERE visibility = 'public'
    ${cursorClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `,
  args: [...cursorArgs, limit + 1], // +1 判断 hasMore
});

const { items, next_cursor } = paginate(result.rows, limit);
```

## 附录 C: 需要的 npm 依赖

```bash
# S2: 认证
npm install bcrypt
npm install -D @types/bcrypt

# S3: 校验
npm install zod

# S4: 上传
npm install @uploadthing/react
```

当前 `package.json` 已有 `uploadthing` v7 服务端 SDK。需额外安装前端 SDK `@uploadthing/react`。
