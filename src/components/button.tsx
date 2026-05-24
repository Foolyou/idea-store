import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full min-h-[44px] px-6 font-medium text-body transition-all duration-100",
        "active:scale-[0.97]",
        variant === "primary" && [
          "bg-action-primary text-white",
          "hover:bg-action-hover",
        ],
        variant === "secondary" && [
          "bg-transparent text-action-primary border border-action-primary",
          "hover:bg-action-primary/5",
        ],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
