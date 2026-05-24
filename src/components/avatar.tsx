import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  size?: AvatarSize;
  src?: string;
  alt?: string;
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
};

export function Avatar({ size = "md", src, alt = "", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover shrink-0", sizeMap[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "rounded-full bg-bg-accent flex items-center justify-center shrink-0 text-text-secondary font-semibold",
        sizeMap[size],
        className
      )}
    >
      {alt ? alt.charAt(0).toUpperCase() : null}
    </span>
  );
}
