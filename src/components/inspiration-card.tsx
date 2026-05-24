"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Tag } from "./tag";

interface InspirationCardProps {
  authorName: string;
  authorAvatar?: string;
  timeAgo: string;
  circleName?: string;
  content: string;
  likeCount?: number;
  bookmarkCount?: number;
  className?: string;
  onCardClick?: () => void;
  onCircleTagClick?: () => void;
  onLike?: () => void;
  onBookmark?: () => void;
}

export function InspirationCard({
  authorName,
  authorAvatar,
  timeAgo,
  circleName,
  content,
  likeCount = 0,
  bookmarkCount = 0,
  className,
  onCardClick,
  onCircleTagClick,
  onLike,
  onBookmark,
}: InspirationCardProps) {
  return (
    <div
      onClick={onCardClick}
      className={cn(
        "bg-bg-card rounded-md p-lg shadow-card flex flex-col gap-md",
        onCardClick && "cursor-pointer",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-sm">
        <Avatar size="md" src={authorAvatar} alt={authorName} />
        <div className="flex flex-col gap-[2px] flex-1 min-w-0">
          <span className="text-caption text-text-primary font-semibold truncate">
            {authorName}
          </span>
          <span className="text-caption text-text-secondary">{timeAgo}</span>
        </div>
        {circleName && (
          <Tag onClick={onCircleTagClick}>{circleName}</Tag>
        )}
      </div>

      {/* Content */}
      <p className="text-body text-text-primary leading-[1.75] whitespace-pre-wrap">
        {content}
      </p>

      {/* Actions */}
      <div className="flex gap-lg">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.();
          }}
          className="text-caption text-text-secondary hover:text-action-primary transition-colors"
        >
          ♡ {likeCount}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark?.();
          }}
          className="text-caption text-text-secondary hover:text-action-primary transition-colors"
        >
          ☆ {bookmarkCount}
        </button>
      </div>
    </div>
  );
}
