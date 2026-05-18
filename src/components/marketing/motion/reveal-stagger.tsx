"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface RevealStaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  initialDelay?: number;
  y?: number;
}

export function RevealStagger({
  children,
  className,
  stagger = 0.08,
  initialDelay = 0,
  y = 20,
}: RevealStaggerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduce ? 0 : stagger,
            delayChildren: reduce ? 0 : initialDelay,
          },
        },
      }}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: reduce ? {} : { opacity: 0, y },
                visible: reduce
                  ? {}
                  : {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.55,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      },
                    },
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

export function RevealStaggerItem({
  children,
  className,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? {} : { opacity: 0, y },
        visible: reduce
          ? {}
          : {
              opacity: 1,
              y: 0,
              transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
            },
      }}
    >
      {children}
    </motion.div>
  );
}
