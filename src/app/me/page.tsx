"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDraft } from "@/hooks/use-draft";
import { Avatar } from "@/components/avatar";
import { InspirationCard } from "@/components/inspiration-card";
import { CircleCard } from "@/components/circle-card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import type { InspirationFeedItem, UserStats, PaginatedResponse } from "@/lib/types";

type Tab = "inspirations" | "circles" | "bookmarks" | "drafts" | "settings";
const TABS: { key: Tab; label: string }[] = [
  { key: "inspirations", label: "我的灵感" },
  { key: "circles", label: "我的圈子" },
  { key: "bookmarks", label: "收藏夹" },
  { key: "drafts", label: "草稿箱" },
  { key: "settings", label: "账号设置" },
];

const TAB_KEYS: Tab[] = ["inspirations", "circles", "bookmarks", "drafts", "settings"];

function MePageContent() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, clearDraft } = useDraft();

  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    TAB_KEYS.includes(initialTab as Tab) ? (initialTab as Tab) : "inspirations"
  );
  const [items, setItems] = useState<InspirationFeedItem[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [nickname, setNick] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user === null) { router.push("/"); return; }
    if (!user) return;

    setNick(user.nickname);

    api<UserStats>("/api/me/stats").then((r) => { if (r.ok) setStats(r.data); });

    const loaders: Record<Tab, () => void> = {
      inspirations: () => api<PaginatedResponse<InspirationFeedItem>>("/api/me/inspirations").then((r) => { if (r.ok) setItems(r.data.items); setLoading(false); }),
      circles: () => api<PaginatedResponse<any>>("/api/me/circles").then((r) => { if (r.ok) setCircles(r.data.items); setLoading(false); }),
      bookmarks: () => api<PaginatedResponse<InspirationFeedItem>>("/api/me/bookmarks").then((r) => { if (r.ok) setItems(r.data.items); setLoading(false); }),
      drafts: () => setLoading(false),
      settings: () => setLoading(false),
    };
    setLoading(true);
    loaders[tab]();
  }, [user, tab, router]);

  async function handleDelete(id: string) {
    await api(`/api/inspirations/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSaveSettings() {
    const body: any = {};
    if (nickname !== user?.nickname) body.nickname = nickname;
    if (oldPw && newPw) body.password = { old: oldPw, new: newPw };
    if (Object.keys(body).length === 0) { setMsg("没有需要保存的更改"); return; }
    const r = await api("/api/me/settings", { method: "PATCH", body: JSON.stringify(body) });
    if (r.ok) { setMsg("保存成功"); refresh(); setOldPw(""); setNewPw(""); }
    else setMsg(r.error);
  }

  if (!user) return null;

  return (
    <div className="max-w-app mx-auto min-h-screen pb-3xl">
      {/* Header */}
      <div className="bg-bg-card shadow-card p-lg mb-md">
        <div className="flex items-center gap-md mb-lg">
          <Avatar size="lg" alt={user.nickname} />
          <div className="flex-1">
            <h1 className="text-title text-text-primary">{user.nickname}</h1>
            <div className="flex gap-lg text-caption text-text-secondary mt-sm">
              {stats && (
                <>
                  <span>{stats.total_inspirations} 灵感</span>
                  <span>{stats.total_likes_received} 获赞</span>
                  <span>{stats.total_bookmarks_received} 收藏</span>
                </>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>退出</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-xs overflow-x-auto pb-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 text-caption px-md py-sm rounded-full transition-colors ${
                tab === t.key
                  ? "bg-action-primary text-white"
                  : "bg-bg-accent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-lg">
        {/* Inspirations / Bookmarks */}
        {(tab === "inspirations" || tab === "bookmarks") && (
          <div className="flex flex-col gap-md">
            {loading && <div className="text-caption text-text-tertiary text-center py-xl">加载中…</div>}
            {!loading && items.length === 0 && (
              <EmptyState
                title={tab === "inspirations" ? "还没有发布灵感" : "还没有收藏灵感"}
                description={tab === "inspirations" ? "去首页发布第一条灵感吧" : "去发现喜欢的灵感"}
                actionLabel={tab === "inspirations" ? "去发布" : "去发现"}
                onAction={() => router.push(tab === "inspirations" ? "/" : "/circles")}
              />
            )}
            {items.map((item) => (
              <div key={item.id} className="relative group">
                <InspirationCard
                  authorName={item.author.nickname}
                  timeAgo={item.created_at}
                  circleName={item.circle_name || undefined}
                  content={item.content}
                  likeCount={item.like_count}
                  bookmarkCount={item.bookmark_count}
                />
                {tab === "inspirations" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-lg right-lg text-caption text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Circles */}
        {tab === "circles" && (
          <div className="flex flex-col gap-md">
            {loading && <div className="text-caption text-text-tertiary text-center py-xl">加载中…</div>}
            {!loading && circles.length === 0 && (
              <EmptyState title="还没有加入圈子" description="去发现一些有趣的圈子" actionLabel="去发现" onAction={() => router.push("/circles")} />
            )}
            {circles.map((c: any) => (
              <CircleCard key={c.id} name={c.name} description={c.description} memberCount={c.member_count} onClick={() => router.push(`/circle/${c.id}`)} />
            ))}
          </div>
        )}

        {/* Drafts */}
        {tab === "drafts" && (
          <div>
            {draft ? (
              <div className="bg-bg-card rounded-md shadow-card p-lg">
                <p className="text-body text-text-primary whitespace-pre-wrap mb-md">{draft}</p>
                <Button variant="secondary" onClick={clearDraft}>清除草稿</Button>
              </div>
            ) : (
              <EmptyState title="暂无草稿" description="发布灵感时会自动保存" />
            )}
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="bg-bg-card rounded-md shadow-card p-lg flex flex-col gap-md">
            <div>
              <label className="text-caption text-text-secondary">昵称</label>
              <input
                className="w-full bg-bg-page rounded-md p-md text-body text-text-primary outline-none mt-sm"
                value={nickname}
                onChange={(e) => setNick(e.target.value)}
              />
            </div>
            <div>
              <label className="text-caption text-text-secondary">修改密码（可选）</label>
              <input
                type="password"
                className="w-full bg-bg-page rounded-md p-md text-body text-text-primary outline-none mt-sm"
                placeholder="旧密码"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
              />
              <input
                type="password"
                className="w-full bg-bg-page rounded-md p-md text-body text-text-primary outline-none mt-sm"
                placeholder="新密码"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            {msg && <p className="text-caption text-text-secondary">{msg}</p>}
            <Button variant="primary" onClick={handleSaveSettings}>保存</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MePage() {
  return (
    <Suspense fallback={null}>
      <MePageContent />
    </Suspense>
  );
}
