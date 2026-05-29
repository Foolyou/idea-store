"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useDraft } from "@/hooks/use-draft";
import { InspirationCard } from "@/components/inspiration-card";
import { FloatingMenu } from "@/components/floating-menu";
import { Toast } from "@/components/toast";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import type { InspirationFeedItem, PaginatedResponse } from "@/lib/types";
import Link from "next/link";

type Visibility = "public" | "circle" | "private";

export default function Home() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const { draft, setDraft, clearDraft } = useDraft();

  const [feed, setFeed] = useState<InspirationFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Visibility selection
  const [vis, setVis] = useState<Visibility>("public");
  const [circleId, setCircleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myCircles, setMyCircles] = useState<{ id: string; name: string }[]>([]);
  const [publishing, setPublishing] = useState(false);

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

  const loadFeed = useCallback(async (reset?: boolean) => {
    setLoadingMore(true);
    if (reset) setLoading(true);
    try {
      const r = await api<PaginatedResponse<InspirationFeedItem>>(
        `/api/inspirations?limit=20`
      );
      if (r.ok) {
        setFeed(r.data.items);
        setCursor(r.data.next_cursor);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(true);
    const onFocus = () => loadFeed(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, loadFeed]);

  // Inherit last publish config (智能默认)
  useEffect(() => {
    if (user) {
      setVis((user.last_visibility as Visibility) || "public");
      setCircleId(user.last_circle_id ?? null);
    }
  }, [user]);

  // Load joined circles when the picker needs them
  useEffect(() => {
    if (pickerOpen && user && myCircles.length === 0) {
      api<PaginatedResponse<{ id: string; name: string }>>("/api/me/circles").then((r) => {
        if (r.ok) setMyCircles(r.data.items);
      });
    }
  }, [pickerOpen, user, myCircles.length]);

  const selectedCircleName =
    myCircles.find((c) => c.id === circleId)?.name ?? "";
  const visLabel =
    vis === "private"
      ? "私密"
      : vis === "circle"
      ? selectedCircleName || "圈子"
      : "公开";

  const handlePublish = useCallback(async () => {
    if (!user) { setShowLogin(true); return; }
    if (!draft.trim() || publishing) return;

    // Circle visibility requires a target circle
    if (vis === "circle" && !circleId) {
      setPickerOpen(true);
      return;
    }

    const body: Record<string, unknown> = { content: draft, visibility: vis };
    if (vis === "circle" && circleId) {
      body.circle_id = circleId;
    }

    setPublishing(true);
    try {
      const r = await api<InspirationFeedItem>("/api/inspirations", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (r.ok) {
        clearDraft();
        // Toast with one-tap unpublish only for public posts (spec §3.2.3 / §7.1)
        if (vis === "public") {
          setToastMsg("已公开发布");
          setToastAction("关闭分享");
          setLastPubId(r.data.id);
        } else {
          setToastMsg("");
          setToastAction("");
        }
        setFeed((prev) => [r.data as InspirationFeedItem, ...prev]);
        // Refresh user so the inherited config stays in sync
        refresh();
      }
    } finally {
      setPublishing(false);
    }
  }, [user, draft, publishing, vis, circleId, clearDraft, refresh]);

  async function handleCloseShare() {
    if (!lastPubId) return;
    await api(`/api/inspirations/${lastPubId}`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: "private" }),
    });
    setToastMsg("");
    setFeed((prev) => prev.filter((i) => i.id !== lastPubId));
  }

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await api<PaginatedResponse<InspirationFeedItem>>(
        `/api/inspirations?limit=20&cursor=${encodeURIComponent(cursor)}`
      );
      if (r.ok) {
        setFeed((prev) => [...prev, ...r.data.items]);
        setCursor(r.data.next_cursor);
      }
    } finally {
      setLoadingMore(false);
    }
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
            <button
              type="button"
              onClick={() => {
                if (!user) { setShowLogin(true); return; }
                setPickerOpen(true);
              }}
              className="text-caption text-text-secondary bg-bg-accent rounded-sm px-sm py-[4px] active:scale-[0.97] transition-transform"
            >
              🌐 {visLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="bg-action-primary text-white rounded-full min-h-[44px] px-xl text-body font-medium hover:bg-action-hover transition-colors active:scale-[0.97] disabled:opacity-60"
          >
            {publishing ? "发布中…" : "发布"}
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
          <EmptyState title="还没有灵感" description="去发现一些有趣的圈子吧" actionLabel="去发现圈子" onAction={() => router.push("/circles")} />
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
            onClick={handleLoadMore}
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

      {/* Visibility picker */}
      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择可见范围">
        <div className="flex flex-col gap-sm">
          <button
            onClick={() => { setVis("public"); setCircleId(null); setPickerOpen(false); }}
            className={`text-left rounded-md p-md transition-colors ${vis === "public" ? "bg-bg-accent" : "hover:bg-bg-accent"}`}
          >
            <div className="text-body text-text-primary">🌐 公开</div>
            <div className="text-caption text-text-tertiary">所有人都能在社区流看到</div>
          </button>

          <button
            onClick={() => setVis("circle")}
            className={`text-left rounded-md p-md transition-colors ${vis === "circle" ? "bg-bg-accent" : "hover:bg-bg-accent"}`}
          >
            <div className="text-body text-text-primary">👥 圈子</div>
            <div className="text-caption text-text-tertiary">仅所选圈子的成员可见</div>
          </button>

          {vis === "circle" && (
            <div className="flex flex-col gap-xs pl-md">
              {myCircles.length === 0 && (
                <div className="text-caption text-text-tertiary py-sm">
                  你还没有加入任何圈子，
                  <Link href="/circles" className="text-action-primary underline">去发现圈子</Link>
                </div>
              )}
              {myCircles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCircleId(c.id); setPickerOpen(false); }}
                  className={`text-left text-caption rounded-sm px-md py-sm transition-colors ${circleId === c.id ? "bg-action-primary text-white" : "bg-bg-page text-text-primary hover:bg-bg-accent"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => { setVis("private"); setCircleId(null); setPickerOpen(false); }}
            className={`text-left rounded-md p-md transition-colors ${vis === "private" ? "bg-bg-accent" : "hover:bg-bg-accent"}`}
          >
            <div className="text-body text-text-primary">🔒 私密</div>
            <div className="text-caption text-text-tertiary">仅自己可见</div>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
