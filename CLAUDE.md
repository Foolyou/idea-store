@AGENTS.md

# 灵感宝盒 (Idea Store)

## 技术栈
- Next.js 15.5 + Tailwind v4 (CSS @theme 方式配置)
- 数据库：Turso (libsql) — libsql://idea-store-foolyou.aws-ap-northeast-1.turso.io
- 图片上传：UploadThing v7
- 部署：Vercel（push master 自动部署）
- 生产地址：https://idea-store-xi.vercel.app

## 重要文件
- `docs/superpowers/specs/` — 产品需求文档 + 设计规范
- `src/app/globals.css` — Design Token (colors, fonts, spacing, radius, shadows)
- `src/components/` — 12 个 UI 组件
- `src/lib/db.ts` — Turso 客户端

## 开发约定
- 移动端优先 (375-428px)，桌面端最大宽度 480px
- 使用 `cn()` 工具函数 (`src/lib/utils.ts`) 合并 Tailwind 类名
- 所有颜色/间距/圆角使用语义化 Tailwind token（如 `bg-bg-page`、`text-text-primary`）

## 工作流
- **每次开启新功能开发时，必须使用 git worktree 进行隔离开发。** 使用 `EnterWorktree` 工具创建独立工作树。
- 组件展示页: `/showcase` 路由
- 服务连接测试: `/test` 路由
