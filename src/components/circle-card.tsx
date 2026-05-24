import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

interface CircleCardProps {
  name: string;
  description: string;
  memberCount: number;
  avatarSrc?: string;
  className?: string;
  onClick?: () => void;
}

export function CircleCard({
  name,
  description,
  memberCount,
  avatarSrc,
  className,
  onClick,
}: CircleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-bg-card rounded-md px-lg py-[14px] shadow-card flex gap-md items-center",
        onClick && "cursor-pointer",
        className
      )}
    >
      <Avatar size="lg" src={avatarSrc} alt={name} />
      <div className="flex flex-col gap-[4px] flex-1 min-w-0">
        <span className="text-body font-bold text-text-primary truncate">{name}</span>
        <span className="text-caption text-text-secondary truncate">{description}</span>
      </div>
      <span className="text-caption text-text-tertiary shrink-0">
        {memberCount} 成员
      </span>
    </div>
  );
}
