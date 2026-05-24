"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  visible: boolean;
  className?: string;
}

export function Toast({
  message,
  actionLabel,
  onAction,
  visible,
  className,
}: ToastProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 mx-auto mb-lg z-50 max-w-app transition-all duration-200",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0",
        className
      )}
    >
      <div className="bg-text-primary text-white rounded-md px-lg py-md flex gap-md items-center mx-lg shadow-float">
        <span className="text-[14px] flex-1">{message}</span>
        {actionLabel && (
          <button
            onClick={() => {
              onAction?.();
              setShow(false);
            }}
            className="text-action-primary text-[14px] font-medium shrink-0 hover:opacity-80 transition-opacity"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
