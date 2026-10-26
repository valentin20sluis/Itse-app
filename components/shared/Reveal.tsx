"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
};

// SSR and first paint render visible: content is only hidden after hydration
// (and only without reduced motion), so a JS failure never leaves it hidden.
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "hidden">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setState("hidden");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setState("visible");
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-state={state}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        state === "hidden" && "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
