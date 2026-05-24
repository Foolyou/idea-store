"use client";

import { useState, useEffect, use } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/avatar";
import { Tag } from "@/components/tag";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { InspirationDetail } from "@/lib/types";
import Link from "next/link";

export default function IdeaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const { user } = useAuth();
  const [data, setData] = useState<InspirationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [delOpen, setDelOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    api<InspirationDetail>(`/api/inspirations/${id}`).then((r) => {
      if (r.ok) {
        setData(r.data);
        setLiked(r.data.is_liked);
        setLikeCount(r.data.like_count);
        setBookmarked(r.data.is_bookmarked);
        setBookmarkCount(r.data.bookmark_count);
      }
      setLoading(false);
    });
  }, [id]);

  async function toggleLike() {
    if (!user) return;
    const r = await api<{ liked: boolean; like_count: number }>(
      `/api/inspirations/${id}/like`,
      { method: "POST" }
    );
    if (r.ok) {
      setLiked(r.data.liked);
      setLikeCount(r.data.like_count);
    }
  }

  async function toggleBookmark() {
    if (!user) return;
    const r = await api<{ bookmarked: boolean; bookmark_count: number }>(
      `/api/inspirations/${id}/bookmark`,
      { method: "POST" }
    );
    if (r.ok) {
      setBookmarked(r.data.bookmarked);
      setBookmarkCount(r.data.bookmark_count);
    }
  }

  async function handleDelete() {
    const r = await api(`/api/inspirations/${id}`, { method: "DELETE" });
    if (r.ok) setDeleted(true);
    setDelOpen(false);
  }

  if (loading) return <div className="max-w-app mx-auto p-lg text-caption text-text-tertiary">加载中…</div>;
  if (!data) return <div className="max-w-app mx-auto p-lg text-caption text-text-tertiary">灵感不存在</div>;
  if (deleted) return <div className="max-w-app mx-auto p-lg text-caption text-text-tertiary">已删除</div>;

  const isAuthor = user?.id === data.author.id;
  const images = typeof data.images === "string" ? JSON.parse(data.images as string) : data.images;

  return (
    <div className="max-w-app mx-auto min-h-screen pb-3xl">
      {/* Back button */}
      <div className="flex items-center gap-sm px-lg py-md">
        <Link href="/" className="text-caption text-text-secondary hover:text-text-primary">&larr; 返回</Link>
      </div>

      <div className="bg-bg-card rounded-md shadow-card p-lg mx-lg">
        {/* Author */}
        <div className="flex items-center gap-sm mb-md">
          <Avatar size="md" alt={data.author.nickname} />
          <div className="flex-1">
            <div className="text-caption font-semibold text-text-primary">{data.author.nickname}</div>
            <div className="text-caption text-text-tertiary">{new Date(data.created_at).toLocaleString("zh-CN")}</div>
          </div>
          {data.circle_name && (
            <Link href={`/circle/${data.circle_id}`}>
              <Tag>{data.circle_name}</Tag>
            </Link>
          )}
        </div>

        {/* Content */}
        <p className="text-body text-text-primary mb-md whitespace-pre-wrap">{data.content}</p>

        {/* Images */}
        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-sm mb-md">
            {images.map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-full rounded-sm object-cover max-h-[300px]" />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-lg text-caption text-text-secondary">
          <button onClick={toggleLike} className={liked ? "text-red-500" : ""}>
            {liked ? "❤" : "♡"} {likeCount}
          </button>
          <button onClick={toggleBookmark} className={bookmarked ? "text-action-primary" : ""}>
            {bookmarked ? "★" : "☆"} {bookmarkCount}
          </button>
          {isAuthor && (
            <div className="ml-auto flex gap-sm">
              <button
                onClick={() => setDelOpen(true)}
                className="text-text-tertiary hover:text-red-500"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={delOpen}
        title="确定删除这条灵感？"
        message="删除后不可恢复。"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={handleDelete}
        onCancel={() => setDelOpen(false)}
      />
    </div>
  );
}
