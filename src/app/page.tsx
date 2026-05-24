"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDraft } from "@/hooks/use-draft";
import { InspirationCard } from "@/components/inspiration-card";
import { FloatingMenu } from "@/components/floating-menu";
import { Toast } from "@/components/toast";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { InspirationFeedItem, PaginatedResponse } from "@/lib/types";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();
  const { draft, setDraft, clearDraft } = useDraft();

  const [feed, setFeed] = useState<InspirationFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Publish state
  const [showLogin, setShowLogin] = useState(false);
  const [loginNickname, setLoginNick] = useState("");
  const [loginPassword, setLoginPw] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState("");

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastAction, setToastAction] = useState("");
  const [lastPubId, setLastPubId] = useState("");

  async function loadFeed(reset?: boolean) {
    const c = reset ? undefined : (cursor || undefined);
    const r = await api<PaginatedResponse<InspirationFeedItem>>(
      `/api/inspirations?limit=20${c ? `&cursor=${encodeURIComponent(c)}` : ""}`
    );
    if (r.ok) {
      setFeed(reset ? r.data.items : [...feed, ...r.data.items]);
      setCursor(r.data.next_cursor);
    }
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    loadFeed(true);
    const onFocus = () => loadFeed(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  const handlePublish = useCallback(async () => {
    if (!user) { setShowLogin(true); return; }
    if (!draft.trim()) return;

    const r = await api<InspirationFeedItem>("/api/inspirations", {
      method: "POST",
      body: JSON.stringify({ content: draft, visibility: "public" }),
    });
    if (r.ok) {
      clearDraft();
      setToastMsg("已公开发布");
      setToastAction("关闭分享");
      setLastPubId(r.data.id);
      setFeed((prev) => [r.data as InspirationFeedItem, ...prev]);
    }
  }, [user, draft, clearDraft]);

  async function handleCloseShare() {
    if (!lastPubId) return;
    await api(`/api/inspirations/${lastPubId}`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: "private" }),
    });
    setToastMsg("");
    setFeed((prev) => prev.filter((i) => i.id !== lastPubId));
  }

  async function handleAuth() {
    const path = isRegister ? "/api/auth/register" : "/api/auth/login";
    const r = await api(path, {
      method: "POST",
      body: JSON.stringify({ nickname: loginNickname, password: loginPassword }),
    });
    if (r.ok) {
      setShowLogin(false);
      setAuthError("");
      window.location.reload();
    } else {
      setAuthError(r.error);
    }
  }

  return (
    <div className="max-w-app mx-auto min-h-screen relative">
      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-lg" onClick={() => setShowLogin(false)}>
          <div className="bg-bg-card rounded-lg p-xl w-full max-w-[320px] shadow-float" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-title text-text-primary mb-lg">{isRegister ? "注册" : "登录"}</h2>
            <input className="w-full bg-bg-page rounded-md p-md text-body text-text-primary outline-none mb-sm" placeholder="昵称" value={loginNickname} onChange={(e) => setLoginNick(e.target.value)} />
            <input type="password" className="w-full bg-bg-page rounded-md p-md text-body text-text-primary outline-none mb-md" placeholder="密码" value={loginPassword} onChange={(e) => setLoginPw(e.target.value)} />
            {authError && <p className="text-caption text-red-500 mb-sm">{authError}</p>}
            <Button variant="primary" onClick={handleAuth}>{isRegister ? "注册" : "登录"}</Button>
            <button className="w-full text-caption text-text-secondary mt-sm text-center" onClick={() => { setIsRegister(!isRegister); setAuthError(""); }}>
              {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
            </button>
          </div>
        </div>
      )}

      {/* Publish area */}
      <div className="bg-bg-card rounded-b-md px-lg pt-lg pb-lg shadow-card">
        <textarea
          className="w-full bg-bg-page rounded-md p-lg text-body text-text-primary placeholder:text-text-tertiary resize-none outline-none min-h-[80px]"
          placeholder="此刻的想法…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex items-center justify-between mt-md">
          <div className="flex gap-sm">
            <span className="text-caption text-text-secondary bg-bg-accent rounded-sm px-sm py-[4px]">
              📷
            </span>
            <span className="text-caption text-text-secondary bg-bg-accent rounded-sm px-sm py-[4px]">
              🌐 公开
            </span>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            className="bg-action-primary text-white rounded-full min-h-[44px] px-xl text-body font-medium hover:bg-action-hover transition-colors"
          >
            发布
          </button>
        </div>
        {!user && (
          <p className="text-caption text-text-tertiary mt-sm text-center">
            首次发布需要 <button className="text-action-primary underline" onClick={() => setShowLogin(true)}>登录 / 注册</button>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="text-center py-lg">
        <span className="text-caption text-text-tertiary">— 社区灵感 —</span>
      </div>

      {/* Feed */}
      <div className="px-lg flex flex-col gap-md pb-3xl">
        {loading && (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="bg-bg-card rounded-md p-lg shadow-card flex flex-col gap-md">
                <div className="flex items-center gap-sm">
                  <Skeleton variant="circular" width={32} height={32} />
                  <div className="flex flex-col gap-[6px] flex-1">
                    <Skeleton variant="text" width="80px" />
                    <Skeleton variant="text" width="120px" />
                  </div>
                </div>
                <Skeleton variant="text" />
                <Skeleton variant="text" width="60%" />
              </div>
            ))}
          </>
        )}
        {!loading && feed.length === 0 && (
          <EmptyState title="还没有灵感" description="去发现一些有趣的圈子吧" actionLabel="去发现圈子" />
        )}
        {feed.map((item) => (
          <Link key={item.id} href={`/idea/${item.id}`} className="block">
            <InspirationCard
              authorName={item.author.nickname}
              timeAgo={item.created_at}
              circleName={item.circle_name || undefined}
              content={item.content}
              likeCount={item.like_count}
              bookmarkCount={item.bookmark_count}
            />
          </Link>
        ))}
        {cursor && !loading && (
          <button
            onClick={() => { setLoadingMore(true); loadFeed(); }}
            disabled={loadingMore}
            className="text-caption text-text-secondary text-center py-md hover:text-text-primary"
          >
            {loadingMore ? "加载中…" : "加载更多"}
          </button>
        )}
        {!cursor && feed.length > 0 && (
          <div className="text-caption text-text-tertiary text-center py-md">已经到底了</div>
        )}
      </div>

      <FloatingMenu />
      <Toast visible={!!toastMsg} message={toastMsg} actionLabel={toastAction} onAction={toastAction ? handleCloseShare : undefined} />
    </div>
  );
}
