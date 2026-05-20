"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface ScrollMarqueeProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
}

export function ScrollMarquee({
  children,
  className,
  duration = 30,
  direction = "left",
  pauseOnHover = true,
}: ScrollMarqueeProps) {
  const reduce = useReducedMotion();
  const distance = direction === "left" ? "-50%" : "0%";
  const start = direction === "left" ? "0%" : "-50%";

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`group overflow-hidden ${className ?? ""}`.trim()}>
      <motion.div
        className="flex w-max gap-12 will-change-transform"
        animate={{ x: [start, distance] }}
        transition={{
          duration,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
        }}
        style={pauseOnHover ? { animationPlayState: "running" } : undefined}
      >
        <div className="flex shrink-0 gap-12">{children}</div>
        <div aria-hidden className="flex shrink-0 gap-12">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
