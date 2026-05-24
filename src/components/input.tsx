import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes, InputHTMLAttributes } from "react";

interface InputProps {
  as?: "input" | "textarea";
  state?: "default" | "focus" | "disabled";
  className?: string;
  placeholder?: string;
}

export function Input({
  as = "textarea",
  state = "default",
  className,
  placeholder = "此刻的想法…",
  ...props
}: InputProps &
  InputHTMLAttributes<HTMLInputElement> &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const base =
    "w-full bg-bg-card rounded-md px-lg py-[14px] text-body text-text-primary placeholder:text-text-tertiary resize-none outline-none transition-all";

  const stateStyles: Record<string, string> = {
    default: "ring-0",
    focus: "ring-2 ring-action-primary ring-offset-0",
    disabled: "bg-bg-accent text-text-tertiary cursor-not-allowed",
  };

  const Tag = as;

  return (
    <Tag
      className={cn(base, stateStyles[state], className)}
      placeholder={placeholder}
      disabled={state === "disabled"}
      rows={Tag === "textarea" ? 3 : undefined}
      {...props}
    />
  );
}
