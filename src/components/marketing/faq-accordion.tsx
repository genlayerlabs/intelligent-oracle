"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="border-t border-black">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question} className="border-b border-black">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-6 py-7 text-left text-xl font-light text-[#2e2e2e] transition hover:text-black"
            >
              <span>{item.question}</span>
              <motion.span
                className="inline-flex size-7 items-center justify-center text-3xl leading-none"
                animate={
                  reduce
                    ? undefined
                    : { rotate: isOpen ? 45 : 0, color: isOpen ? "var(--brand-lavender)" : "#2e2e2e" }
                }
                transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={
                    reduce ? { height: "auto", opacity: 1 } : { height: "auto", opacity: 1 }
                  }
                  exit={reduce ? { height: 0, opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.35, ease: [0.21, 0.47, 0.32, 0.98] },
                    opacity: { duration: 0.25 },
                  }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-7 text-lg font-light leading-8 text-black/65">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
