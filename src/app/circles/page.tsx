"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CircleCard } from "@/components/circle-card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import type { CircleItem } from "@/lib/types";
import Link from "next/link";

export default function CirclesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [circles, setCircles] = useState<CircleItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    const r = await api<{ items: CircleItem[] }>(`/api/circles?search=${encodeURIComponent(q || "")}`);
    if (r.ok) setCircles(r.data.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(value), 300);
  }

  async function handleJoin(circleId: string) {
    const r = await api(`/api/circles/${circleId}/join`, { method: "POST" });
    if (r.ok) {
      setCircles((prev) =>
        prev.map((c) => (c.id === circleId ? { ...c, member_count: c.member_count + 1, is_joined: true } : c))
      );
    }
  }

  return (
    <div className="max-w-app mx-auto min-h-screen pb-3xl">
      <div className="flex items-center gap-sm px-lg py-md">
        <Link href="/" className="text-caption text-text-secondary hover:text-text-primary">&larr; 首页</Link>
        <h1 className="text-title text-text-primary flex-1">发现圈子</h1>
      </div>

      {/* Search */}
      <div className="px-lg mb-md">
        <input
          className="w-full bg-bg-card rounded-md p-lg text-body text-text-primary placeholder:text-text-tertiary outline-none shadow-card"
          placeholder="搜索圈子…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Create button */}
      {user && (
        <div className="px-lg mb-md">
          <Button variant="secondary" onClick={async () => {
            const name = prompt("圈子名称:");
            if (!name) return;
            const desc = prompt("圈子简介:") || "";
            const r = await api<CircleItem>("/api/circles", {
              method: "POST",
              body: JSON.stringify({ name, description: desc }),
            });
            if (r.ok) load(search);
          }}>+ 创建圈子</Button>
        </div>
      )}

      {/* List */}
      <div className="px-lg flex flex-col gap-md">
        {loading && <div className="text-caption text-text-tertiary text-center py-2xl">加载中…</div>}
        {!loading && circles.length === 0 && (
          <EmptyState title="还没有圈子" description="创建一个圈子开始分享灵感吧" />
        )}
        {circles.map((c) => (
          <CircleCard
            key={c.id}
            name={c.name}
            description={c.description}
            memberCount={c.member_count}
            onClick={() => router.push(`/circle/${c.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
