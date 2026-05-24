import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Tag({ children, className, onClick }: TagProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "bg-bg-accent text-text-secondary rounded-sm px-[8px] py-[2px] text-caption inline-block",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </span>
  );
}
