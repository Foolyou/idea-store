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
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
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
