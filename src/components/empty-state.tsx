import { cn } from "@/lib/utils";
import { Button } from "./button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-3xl gap-lg text-center px-xl",
        className
      )}
    >
      {icon ? (
        <div className="text-4xl mb-md text-text-tertiary">{icon}</div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-bg-accent mb-md" />
      )}
      <p className="text-body text-text-secondary">{title}</p>
      <p className="text-caption text-text-tertiary -mt-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} className="mt-sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
