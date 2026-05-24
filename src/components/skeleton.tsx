import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
}: SkeletonProps) {
  return (
    <div
      style={{ width, height }}
      className={cn(
        "animate-pulse bg-bg-accent",
        variant === "text" && "h-4 rounded-sm w-full",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-md",
        className
      )}
    />
  );
}
