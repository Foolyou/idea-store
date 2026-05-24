"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-bg-card rounded-t-lg z-50 max-h-[80vh] overflow-y-auto transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-md pb-sm">
          <div className="w-9 h-1 rounded-full bg-divider" />
        </div>

        {title && (
          <h3 className="text-title text-text-primary px-lg pb-md">{title}</h3>
        )}

        <div className="px-lg pb-lg">{children}</div>
      </div>
    </>
  );
}
