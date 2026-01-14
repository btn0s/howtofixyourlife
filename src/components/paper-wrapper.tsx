"use client";

import { cn } from "@/lib/utils";

interface PaperWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PaperWrapper({ children, className }: PaperWrapperProps) {
  return (
    <div
      className={cn(
        "relative font-serif text-sm selection:bg-black/10 transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter] duration-700 ease-in-out",
        "bg-[#fffdfa] text-zinc-900 shadow-lg border border-black/3",
        "dark:bg-zinc-950 dark:text-zinc-100 dark:border-white/5",
        className
      )}
    >
      {/* Base texture layer */}
      <div
        className={cn(
          "absolute inset-0 paper-texture pointer-events-none opacity-[0.12]",
          "dark:opacity-[0.08]"
        )}
      />

      {/* Grain texture layer */}
      <div
        className={cn(
          "absolute inset-0 paper-grain pointer-events-none opacity-[0.15]",
          "dark:opacity-[0.1]"
        )}
      />

      {/* Paper fibers texture */}
      <div
        className={cn(
          "absolute inset-0 paper-fibers pointer-events-none opacity-100",
          "dark:opacity-60"
        )}
      />

      {/* Subtle crease/fold line effect */}
      <div className="absolute left-12 top-0 bottom-0 w-px bg-black/1 dark:bg-white/2 pointer-events-none" />

      <div className="relative z-10 pt-12 pb-16 px-8 sm:px-12">
        {children}
      </div>
    </div>
  );
}
