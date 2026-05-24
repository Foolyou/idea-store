"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "确定",
  cancelLabel = "取消",
  variant = "default",
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-lg">
      <div
        className={cn(
          "bg-bg-card rounded-lg p-xl max-w-[320px] w-full shadow-float animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        <h3 className="text-title text-text-primary mb-sm">{title}</h3>
        <p className="text-body text-text-secondary mb-lg">{message}</p>
        <div className="flex justify-end gap-sm">
          <button
            onClick={onCancel}
            className="min-h-[44px] px-lg text-body text-text-secondary rounded-full hover:bg-bg-accent transition-colors"
          >
            {cancelLabel}
          </button>
          <Button
            variant={variant === "danger" ? "primary" : "primary"}
            onClick={onConfirm}
            className={variant === "danger" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
