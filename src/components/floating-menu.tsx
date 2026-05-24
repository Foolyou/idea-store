"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface MenuItem {
  label: string;
  onClick?: () => void;
}

interface FloatingMenuProps {
  items?: MenuItem[];
  className?: string;
}

const defaultItems: MenuItem[] = [
  { label: "我的灵感" },
  { label: "我的圈子" },
  { label: "收藏夹" },
  { label: "草稿箱" },
  { label: "发现圈子" },
  { label: "账号设置" },
];

export function FloatingMenu({
  items = defaultItems,
  className,
}: FloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu button */}
      <div className={cn("fixed bottom-lg right-lg z-50", className)}>
        {isOpen ? (
          /* Expanded panel */
          <div className="bg-bg-card rounded-lg shadow-float px-lg py-md flex flex-col gap-[4px] min-w-[140px] transition-all duration-200 ease-out">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className="text-[14px] text-text-primary py-[6px] px-sm rounded-sm hover:bg-bg-accent text-left transition-colors"
              >
                {item.label}
              </button>
            ))}
            <hr className="border-divider my-[2px]" />
            <button
              onClick={() => setIsOpen(false)}
              className="text-[14px] text-text-tertiary py-[6px] px-sm text-left hover:text-text-secondary transition-colors"
            >
              关闭
            </button>
          </div>
        ) : (
          /* Collapsed ball */
          <button
            onClick={() => setIsOpen(true)}
            className="w-12 h-12 rounded-full bg-action-primary shadow-float flex items-center justify-center hover:bg-action-hover transition-colors active:scale-[0.97]"
          >
            <span className="text-white text-2xl leading-none">⋯</span>
          </button>
        )}
      </div>
    </>
  );
}
