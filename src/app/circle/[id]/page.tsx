"use client";

import { useState, useEffect, use } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/avatar";
import { InspirationCard } from "@/components/inspiration-card";
import { Button } from "@/components/button";
import type { CircleItem, InspirationFeedItem, UserPublic, PaginatedResponse } from "@/lib/types";
import Link from "next/link";

export default function CirclePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { user } = useAuth();
  const [circle, setCircle] = useState<CircleItem | null>(null);
  const [joined, setJoined] = useState(false);
  const [items, setItems] = useState<InspirationFeedItem[]>([]);
  const [members, setMembers] = useState<(UserPublic & { joined_at: string })[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [c, f, m] = await Promise.all([
      api<CircleItem>(`/api/circles/${id}`),
      api<PaginatedResponse<InspirationFeedItem>>(`/api/circles/${id}/inspirations`),
      api<PaginatedResponse<UserPublic & { joined_at: string }>>(`/api/circles/${id}/members`),
    ]);
    if (c.ok) { setCircle(c.data); setJoined(c.data.is_joined); }
    if (f.ok) setItems(f.data.items);
    if (m.ok) setMembers(m.data.items);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleJoin() {
    const r = await api<{ joined: boolean }>(`/api/circles/${id}/join`, { method: "POST" });
    if (r.ok) {
      setJoined(true);
      setCircle((prev) => prev ? { ...prev, member_count: prev.member_count + 1, is_joined: true } : prev);
    }
  }

  async function handlePublish(content: string) {
    if (!content.trim()) return;
    await api("/api/inspirations", {
      method: "POST",
      body: JSON.stringify({ content, visibility: "circle", circle_id: id }),
    });
    load();
  }

  if (loading) return <div className="max-w-app mx-auto p-lg text-caption text-text-tertiary">加载中…</div>;
  if (!circle) return <div className="max-w-app mx-auto p-lg text-caption text-text-tertiary">圈子不存在</div>;

  return (
    <div className="max-w-app mx-auto min-h-screen pb-3xl">
      <div className="flex items-center gap-sm px-lg py-md">
        <Link href="/circles" className="text-caption text-text-secondary hover:text-text-primary">&larr; 发现</Link>
      </div>

      {/* Circle header */}
      <div className="bg-bg-card rounded-md shadow-card p-lg mx-lg mb-md">
        <div className="flex items-center gap-md">
          <Avatar size="lg" alt={circle.name} />
          <div className="flex-1">
            <h1 className="text-title text-text-primary">{circle.name}</h1>
            <p className="text-caption text-text-secondary">{circle.description}</p>
            <p className="text-caption text-text-tertiary mt-sm">{circle.member_count} 位成员</p>
          </div>
          {!joined && (
            <Button variant="primary" onClick={handleJoin}>加入</Button>
          )}
        </div>
      </div>

      {/* Publish (if joined) */}
      {joined && (
        <div className="bg-bg-card rounded-md shadow-card p-lg mx-lg mb-md">
          <textarea
            className="w-full bg-bg-page rounded-md p-lg text-body text-text-primary placeholder:text-text-tertiary resize-none outline-none min-h-[60px]"
            placeholder="在圈子里分享灵感…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handlePublish((e.target as HTMLTextAreaElement).value);
                (e.target as HTMLTextAreaElement).value = "";
              }
            }}
          />
        </div>
      )}

      {/* Feed */}
      <div className="px-lg flex flex-col gap-md">
        {items.map((item) => (
          <InspirationCard
            key={item.id}
            authorName={item.author.nickname}
            timeAgo={item.created_at}
            circleName={item.circle_name || undefined}
            content={item.content}
            likeCount={item.like_count}
            bookmarkCount={item.bookmark_count}
          />
        ))}
        {items.length === 0 && (
          <div className="text-caption text-text-tertiary text-center py-2xl">暂无灵感</div>
        )}
      </div>

      {/* Members */}
      <div className="px-lg mt-xl">
        <h2 className="text-caption font-semibold text-text-secondary mb-sm">成员</h2>
        <div className="flex flex-wrap gap-sm">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-xs bg-bg-card rounded-full px-sm py-xs shadow-card">
              <Avatar size="sm" alt={m.nickname} />
              <span className="text-caption text-text-primary">{m.nickname}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
