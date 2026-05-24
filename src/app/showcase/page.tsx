"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Tag } from "@/components/tag";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { InspirationCard } from "@/components/inspiration-card";
import { CircleCard } from "@/components/circle-card";
import { Toast } from "@/components/toast";
import { FloatingMenu } from "@/components/floating-menu";
import { BottomSheet } from "@/components/bottom-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";

const colors = [
  { name: "bg-page", hex: "#F5F0EB" },
  { name: "bg-card", hex: "#FFFFFF" },
  { name: "bg-accent", hex: "#EDE4D9" },
  { name: "text-primary", hex: "#4A3728" },
  { name: "text-secondary", hex: "#8B7355" },
  { name: "text-tertiary", hex: "#B0A090" },
  { name: "action-primary", hex: "#D4A853" },
  { name: "action-hover", hex: "#C49A3F" },
  { name: "divider", hex: "#E0D5C8" },
];

const spacings = [
  { name: "xs", val: 4 },
  { name: "sm", val: 8 },
  { name: "md", val: 12 },
  { name: "lg", val: 16 },
  { name: "xl", val: 20 },
  { name: "2xl", val: 24 },
  { name: "3xl", val: 32 },
];

const radii = [
  { name: "sm", val: 8 },
  { name: "md", val: 14 },
  { name: "lg", val: 20 },
  { name: "full", val: 9999 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2xl">
      <h2 className="text-title text-text-primary mb-lg">{title}</h2>
      {children}
    </section>
  );
}

export default function Showcase() {
  const [toastVisible, setToastVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="max-w-app mx-auto p-lg min-h-screen pb-3xl">
      {/* Header */}
      <div className="py-2xl text-center">
        <h1 className="text-[28px] font-bold text-text-primary mb-sm">灵感宝盒 · 组件库</h1>
        <p className="text-caption text-text-secondary">
          Design System v1.0 · 大地调
        </p>
      </div>

      {/* Design Tokens */}
      <Section title="🎨 色彩 Colors">
        <div className="flex flex-wrap gap-sm">
          {colors.map((c) => (
            <div key={c.name} className="flex flex-col gap-[4px]">
              <div
                className="w-[80px] h-[52px] rounded-sm border border-divider"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-[11px] text-text-primary font-medium">{c.name}</span>
              <span className="text-[10px] text-text-tertiary">{c.hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="🔤 字体 Typography">
        <div className="space-y-md">
          <div>
            <span className="text-[10px] text-text-tertiary">title · 20px / 600 / 1.4</span>
            <p className="text-title text-text-primary">灵感宝盒记录每一个闪光的想法</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">body · 16px / 400 / 1.75</span>
            <p className="text-body text-text-primary">灵感宝盒记录每一个闪光的想法</p>
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary">caption · 13px / 400 / 1.5</span>
            <p className="text-caption text-text-secondary">灵感宝盒记录每一个闪光的想法</p>
          </div>
        </div>
      </Section>

      <Section title="📏 间距 Spacing">
        <div className="space-y-sm">
          {spacings.map((s) => (
            <div key={s.name} className="flex items-center gap-sm">
              <span className="text-caption text-text-tertiary w-[30px]">{s.name}</span>
              <div className="h-4 bg-action-primary rounded-[3px]" style={{ width: s.val * 2 }} />
              <span className="text-caption text-text-secondary">{s.val}px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="⭕ 圆角 Radius + 阴影 Shadows">
        <div className="flex gap-md flex-wrap items-start">
          {radii.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-[4px]">
              <div
                className="w-[56px] h-[56px] border border-action-primary bg-action-primary/10"
                style={{ borderRadius: r.val === 9999 ? "50%" : r.val }}
              />
              <span className="text-[11px] text-text-primary">{r.name}</span>
              <span className="text-[10px] text-text-tertiary">{r.val === 9999 ? "full" : `${r.val}px`}</span>
            </div>
          ))}
          {/* Shadow cards */}
          <div className="flex flex-col items-center gap-[4px]">
            <div className="w-[56px] h-[56px] bg-bg-card rounded-md shadow-card" />
            <span className="text-[11px] text-text-primary">card</span>
          </div>
          <div className="flex flex-col items-center gap-[4px]">
            <div className="w-[56px] h-[56px] bg-bg-card rounded-md shadow-float" />
            <span className="text-[11px] text-text-primary">float</span>
          </div>
        </div>
      </Section>

      {/* Components */}
      <Section title="🧩 Avatar 头像">
        <div className="flex gap-md items-end">
          <Avatar size="sm" alt="王" />
          <Avatar size="md" alt="王" />
          <Avatar size="lg" alt="王" />
          <Avatar size="md" src="https://i.pravatar.cc/100" alt="小王" />
        </div>
      </Section>

      <Section title="🏷 Tag 标签">
        <div className="flex gap-sm">
          <Tag>产品设计圈</Tag>
          <Tag>独立开发圈</Tag>
          <Tag>日常灵感</Tag>
        </div>
      </Section>

      <Section title="🔘 Button 按钮">
        <div className="flex flex-wrap gap-md items-center">
          <Button variant="primary">发布</Button>
          <Button variant="secondary">取消</Button>
          <Button variant="primary" disabled>
            已禁用
          </Button>
          <Button variant="secondary" disabled>
            已禁用
          </Button>
        </div>
      </Section>

      <Section title="✏️ Input 输入框">
        <div className="space-y-md max-w-[340px]">
          <Input as="textarea" state="default" placeholder="此刻的想法…" />
          <Input as="textarea" state="focus" placeholder="此刻的想法…" />
          <Input as="textarea" state="disabled" placeholder="此刻的想法…" />
        </div>
      </Section>

      <Section title="📇 InspirationCard 灵感卡片">
        <div className="max-w-[340px] space-y-md">
          <InspirationCard
            authorName="设计师小王"
            timeAgo="15 分钟前"
            circleName="产品设计圈"
            content="复古像素风配现代圆角，这个反差感应该很有趣。我打算先做个组件库把基础元素定下来。"
            likeCount={12}
            bookmarkCount={3}
          />
          <InspirationCard
            authorName="小陈"
            timeAgo="3 分钟前"
            content="刚刚想到一个绝妙的点子：用 AI 帮用户自动分类灵感标签"
            likeCount={8}
            bookmarkCount={1}
          />
        </div>
      </Section>

      <Section title="🫧 CircleCard 圈子卡片">
        <div className="max-w-[340px]">
          <CircleCard
            name="产品设计圈"
            description="产品与设计灵感交流"
            memberCount={128}
          />
        </div>
      </Section>

      <Section title="💬 Toast 轻提示">
        <div className="space-y-md">
          <button
            className="text-caption text-action-primary underline"
            onClick={() => setToastVisible(!toastVisible)}
          >
            {toastVisible ? "隐藏" : "显示"} Toast
          </button>
          <Toast
            visible={toastVisible}
            message="已公开发布"
            actionLabel="关闭分享"
            onAction={() => setToastVisible(false)}
          />
        </div>
      </Section>

      <Section title="🎯 FloatingMenu 菜单球">
        <div className="h-[100px] relative bg-bg-page rounded-md border border-dashed border-divider flex items-center justify-center">
          <span className="text-caption text-text-tertiary">（悬浮按钮在右下角）</span>
          <FloatingMenu />
        </div>
      </Section>

      <Section title="📋 BottomSheet 底部面板">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          打开 Sheet
        </Button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="选择可见范围">
          <div className="space-y-sm">
            {["公开", "圈子", "私人"].map((v) => (
              <button
                key={v}
                className="w-full text-body text-text-primary py-md px-lg rounded-md hover:bg-bg-accent text-left"
                onClick={() => setSheetOpen(false)}
              >
                {v}
              </button>
            ))}
          </div>
        </BottomSheet>
      </Section>

      <Section title="⚠️ ConfirmDialog 确认弹窗">
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          删除这条灵感
        </Button>
        <ConfirmDialog
          open={dialogOpen}
          title="确定删除这条灵感？"
          message="删除后不可恢复。"
          confirmLabel="删除"
          cancelLabel="取消"
          variant="danger"
          onConfirm={() => setDialogOpen(false)}
          onCancel={() => setDialogOpen(false)}
        />
      </Section>

      <Section title="📭 EmptyState 空状态">
        <EmptyState
          title="还没有灵感"
          description="去发现一些有趣的圈子吧"
          actionLabel="去发现圈子"
        />
        <EmptyState
          title="暂无草稿"
          description="发布灵感时会自动保存为草稿"
        />
      </Section>

      <Section title="💀 Skeleton 骨架屏">
        <div className="bg-bg-card rounded-md p-lg shadow-card flex flex-col gap-md w-[340px]">
          <div className="flex items-center gap-sm">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="flex flex-col gap-[6px] flex-1">
              <Skeleton variant="text" width="80px" />
              <Skeleton variant="text" width="120px" />
            </div>
          </div>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="60%" />
          <div className="flex gap-lg">
            <Skeleton variant="text" width="40px" />
            <Skeleton variant="text" width="40px" />
          </div>
        </div>
      </Section>
    </div>
  );
}
