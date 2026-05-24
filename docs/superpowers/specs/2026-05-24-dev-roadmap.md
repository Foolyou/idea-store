# 灵感宝盒 — 开发路线图

| 属性 | 信息 |
|------|------|
| 文档版本 | v1.0 |
| 发布日期 | 2026-05-24 |
| 依赖 | 产品需求文档 v1.0、设计规范 v1.0 |

---

## 依赖关系总览

```
S1: DB Schema ──┐
                ├── S3: 用户系统 ──┬── S4: 灵感 CRUD ──┬── S8: 页面集成
S2: Auth 基础 ──┘                  │                    │
                                   └── S6: 圈子 ────────┤
                                                        │
                                   S5: 草稿 ────────────┤
                                                        │
                                   S7: 互动 ────────────┘
```

---

## S1: 数据库 Schema

### 目标
在 Turso 中创建 6 张表，覆盖 PRD 完整数据模型。

### DDL

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  nickname      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  last_visibility TEXT DEFAULT 'public',
  last_circle_id  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE inspirations (
  id             TEXT PRIMARY KEY,
  content        TEXT NOT NULL,
  images         TEXT DEFAULT '[]',
  visibility     TEXT NOT NULL DEFAULT 'public',
  circle_id      TEXT,
  author_id      TEXT NOT NULL REFERENCES users(id),
  like_count     INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE circles (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  creator_id   TEXT NOT NULL REFERENCES users(id),
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE circle_members (
  circle_id TEXT NOT NULL REFERENCES circles(id),
  user_id   TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE likes (
  user_id        TEXT NOT NULL REFERENCES users(id),
  inspiration_id TEXT NOT NULL REFERENCES inspirations(id),
  PRIMARY KEY (user_id, inspiration_id)
);

CREATE TABLE bookmarks (
  user_id        TEXT NOT NULL REFERENCES users(id),
  inspiration_id TEXT NOT NULL REFERENCES inspirations(id),
  PRIMARY KEY (user_id, inspiration_id)
);
```

### 关键设计决策
- `images` 存 JSON 字符串数组（`'["url1","url2"]'`），Turso SQLite 无原生数组
- `like_count` / `bookmark_count` 冗余计数，写入时同步更新，避免 COUNT 查询
- `last_visibility` / `last_circle_id` 存用户表，实现默认配置继承

### 验收标准
- [ ] 6 张表可创建，无语法错误
- [ ] INSERT / SELECT / UPDATE / DELETE 各表正常
- [ ] 外键约束生效

### 文件
- `src/lib/schema.sql` — DDL 脚本
- `src/lib/db.ts` — 更新 Turso 客户端

---

## S2: 认证基础设施

### 目标
实现基于 Session Token 的轻量认证，不使用第三方服务。

### 方案
- 注册时密码用 bcrypt 加密
- 登录后生成随机 session token，写入 `sessions` 表 + httpOnly cookie
- 中间件从 cookie 读取 session token，注入当前用户到请求上下文

### 数据（追加到 S1）

```sql
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 验收标准
- [ ] `POST /api/auth/register` — 昵称 + 密码 → 创建用户，返回 session
- [ ] `POST /api/auth/login` — 昵称 + 密码 → 验证，返回 session
- [ ] `POST /api/auth/logout` — 清除 session
- [ ] `GET /api/auth/me` — 返回当前登录用户信息
- [ ] 密码 bcrypt 加密存储
- [ ] Cookie httpOnly + sameSite 防止 XSS

### 文件
- `src/lib/auth.ts` — register / login / logout / getSession
- `src/lib/password.ts` — bcrypt hash / verify
- `src/app/api/auth/*` — API 路由
- `src/middleware.ts` — 可选：全局认证检查

---

## S3: 用户系统（注册 / 登录 / 设置）

### 目标
基于 S1+S2，实现完整的用户交互流程。

### 功能
| 功能 | 说明 |
|------|------|
| 注册 | 首页 → 注册表单（昵称 + 密码 + 确认密码）→ 成功后直接登录 |
| 登录 | 首页 → 登录表单（昵称 + 密码）→ 成功后跳转首页 |
| 登录态持久化 | Cookie 7 天有效期，关闭浏览器后保持 |
| 修改昵称 | 个人设置页，校验唯一性 |
| 修改密码 | 旧密码验证 + 新密码 |
| 更换头像 | UploadThing 上传 → 更新 avatar_url |

### 验收标准
- [ ] 注册流程端到端可用
- [ ] 登录失败显示错误提示（密码错误 / 用户不存在）
- [ ] 昵称唯一性校验
- [ ] 登录后首页显示当前用户信息（替换 Mock 数据）
- [ ] 退出登录后恢复未登录状态

### 文件
- `src/components/auth-form.tsx` — 注册/登录表单
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/user/settings/route.ts` — 更新昵称/密码/头像

---

## S4: 灵感 CRUD + 图片上传

### 目标
实现灵感的创建、读取、编辑、删除，以及 UploadThing 图片上传。

### 功能
| 功能 | 说明 |
|------|------|
| 发布灵感 | 文字（必填）+ 图片（可选，≤9 张）→ 写入 DB |
| 可见范围 | public / circle / private 三选一 |
| 上传图片 | UploadThing 上传 → 返回 URL → 存入 images 字段 |
| 编辑灵感 | 修改文字 / 增删图片 / 改变范围 |
| 删除灵感 | 软删除或硬删除（MVP 硬删除） |
| 图片格式限制 | JPEG / PNG / WebP，单张 ≤ 10MB |
| 默认继承 | 发布范围 + 圈子默认沿用上次配置 |

### API
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/inspirations` | GET | 社区流列表（分页，公开 + 已加入圈子） |
| `/api/inspirations` | POST | 创建灵感 |
| `/api/inspirations/[id]` | GET | 灵感详情 |
| `/api/inspirations/[id]` | PATCH | 编辑灵感 |
| `/api/inspirations/[id]` | DELETE | 删除灵感 |
| `/api/me/inspirations` | GET | 我的灵感列表 |
| `/api/uploadthing` | POST | 图片上传（UploadThing 路由） |

### 验收标准
- [ ] 发布灵感后出现在首页时间线顶部
- [ ] 三种可见范围正确隔离（私人仅自己可见，圈子仅成员可见）
- [ ] 图片上传成功后返回缩略图预览
- [ ] 编辑后内容原地更新
- [ ] 删除后内容从列表移除
- [ ] 默认继承生效（第二次发布时范围和圈子同上次）
- [ ] XSS 过滤：script 标签等不执行

### 文件
- `src/app/api/inspirations/route.ts`
- `src/app/api/inspirations/[id]/route.ts`
- `src/app/api/me/inspirations/route.ts`
- `src/app/api/uploadthing/core.ts` — UploadThing 配置
- `src/app/api/uploadthing/route.ts`
- `src/components/publish-card.tsx` — 可交互的发布组件

---

## S5: 草稿 + 默认配置继承

### 目标
发布区自动草稿保存 + 上次发布配置自动复用。

### 功能
| 功能 | 说明 |
|------|------|
| 自动保存 | 输入框内容实时写入 localStorage（仅客户端） |
| 图片恢复 | 草稿中的图片一并恢复 |
| 配置继承 | 发布范围 + 目标圈子继承上次发布设置 |
| 单副本 | 新草稿覆盖旧草稿 |

### 验收标准
- [ ] 输入文字后刷新页面 → 草稿自动恢复
- [ ] 选择范围后离开再回来 → 范围选中值保持
- [ ] 清空输入框 → 草稿覆盖为空白
- [ ] 发布成功后 → 草稿清空，但配置保留

### 文件
- `src/lib/draft.ts` — localStorage 读写
- `src/hooks/use-draft.ts` — 草稿 hook

---

## S6: 圈子（创建 / 加入 / 列表 / 成员）

### 目标
实现圈子完整功能。

### 功能
| 功能 | 说明 |
|------|------|
| 创建圈子 | 名称 + 简介，创建者为第一个成员 |
| 加入圈子 | 公开加入，无需审核 |
| 圈子列表 | 浏览全部圈子，支持搜索 |
| 圈子页 | 圈子信息 + 成员列表 + 该圈子灵感流 |
| 圈子内发布 | 可见范围锁定为当前圈子 |

### API
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/circles` | GET | 圈子列表（搜索） |
| `/api/circles` | POST | 创建圈子 |
| `/api/circles/[id]` | GET | 圈子详情 |
| `/api/circles/[id]/join` | POST | 加入圈子 |
| `/api/circles/[id]/members` | GET | 成员列表 |
| `/api/circles/[id]/inspirations` | GET | 圈子灵感流 |
| `/api/me/circles` | GET | 我加入的圈子 |

### 验收标准
- [ ] 创建圈子后出现在圈子列表
- [ ] 加入圈子后成员数 +1
- [ ] 圈子页展示该圈子灵感
- [ ] 圈子内发布灵感自动锁定为该圈子
- [ ] 圈子搜索按名称匹配

### 文件
- `src/app/api/circles/route.ts`
- `src/app/api/circles/[id]/route.ts`
- `src/app/api/circles/[id]/join/route.ts`
- `src/app/api/circles/[id]/members/route.ts`
- `src/app/api/circles/[id]/inspirations/route.ts`
- `src/app/api/me/circles/route.ts`

---

## S7: 互动（点赞 / 收藏 + 统计）

### 目标
实现点赞与收藏功能，及个人统计数字。

### 功能
| 功能 | 说明 |
|------|------|
| 点赞 | 点击切换赞/取消，同步更新 count |
| 收藏 | 点击切换收藏/取消 |
| 统计 | 个人管理页显示「已获赞」「已获收藏」总计 |
| 去重 | 同一用户同一灵感不可重复赞/收藏 |

### API
| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/inspirations/[id]/like` | POST | 切换点赞 |
| `/api/inspirations/[id]/bookmark` | POST | 切换收藏 |
| `/api/me/bookmarks` | GET | 我的收藏列表 |
| `/api/me/stats` | GET | 个人统计（已获赞数、已获收藏数） |

### 验收标准
- [ ] 点赞后数字 +1，再次点击 -1
- [ ] 收藏后出现在收藏夹
- [ ] 取消收藏后从收藏夹消失
- [ ] 统计数字正确汇总

### 文件
- `src/app/api/inspirations/[id]/like/route.ts`
- `src/app/api/inspirations/[id]/bookmark/route.ts`
- `src/app/api/me/bookmarks/route.ts`
- `src/app/api/me/stats/route.ts`

---

## S8: 页面集成

### 目标
将所有功能串联到前端页面，完成可用的 MVP。

### 页面清单

| 路由 | 核心功能 | 状态 |
|------|----------|------|
| `/` | 发布区 + 真实社区流 + 无限滚动 + 下拉刷新 | 改造 |
| `/idea/[id]` | 灵感完整内容 + 作者信息 + 圈子标签 + 赞/收藏 | 新建 |
| `/circle/[id]` | 圈子信息 + 成员 + 圈子灵感流 + 圈子内发布 | 新建 |
| `/circles` | 圈子列表 + 搜索 + 加入 | 新建 |
| `/me` | 5 标签页（灵感/圈子/收藏/草稿/设置） | 新建 |
| Toast | 公开发布 → 「已公开发布」[关闭分享] | 集成 |

### 首页改造
- 发布区接入 S4 发布 API
- 社区流从 API 拉取真实数据，替换 Mock
- 无限滚动（每页 20 条）
- 下拉刷新

### 个人中心改造
- 5 个 Tab：（我的灵感 / 我的圈子 / 收藏夹 / 草稿箱 / 账号设置）
- 每个 Tab 对接对应 API
- 灵感列表支持左滑编辑/删除
- 设置 Tab 接入 S3 修改接口

### 验收标准
- [ ] 全部 5 个页面可正常访问
- [ ] 首页从 API 加载数据
- [ ] 发布流程端到端可用
- [ ] 「关闭分享」Toast 工作正常
- [ ] 登录/未登录状态下页面行为正确
- [ ] 移动端（375px）全部页面 UI 正常

### 文件
- `src/app/page.tsx` — 改造
- `src/app/idea/[id]/page.tsx` — 新建
- `src/app/circle/[id]/page.tsx` — 新建
- `src/app/circles/page.tsx` — 新建
- `src/app/me/page.tsx` — 新建

---

## 实施顺序

```
S1 (DB Schema)     →  1 个 commit
S2 (Auth 基础)     →  1 个 commit，依赖 S1
S3 (用户系统)      →  1 个 commit，依赖 S1+S2
S4 (灵感 CRUD)     →  1 个 commit，依赖 S3
S5 (草稿)          →  1 个 commit，依赖 S4（可与 S4 合并）
S6 (圈子)          →  1 个 commit，依赖 S3
S7 (互动)          →  1 个 commit，依赖 S4
S8 (页面集成)      →  1 个 commit，依赖 S4+S6+S7
```

每个 Spec 完成后独立提交、独立验证，不向前推进未验证的工作。
