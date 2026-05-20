"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Fragment, useMemo, useRef } from "react";

type Segment = string | { gradient: string };

interface ScrollHighlightTextProps {
  segments: Segment[];
  className?: string;
  /** Base color before reveal (default: page muted gray). */
  fromColor?: string;
  /** End color when scrolled past (default: page text color). */
  toColor?: string;
  /** End the reveal at this scroll-progress fraction (lower = finish sooner). */
  finishAt?: number;
}

interface FlatWord {
  text: string;
  gradient: string | null;
}

function flatten(segments: Segment[]): FlatWord[] {
  const words: FlatWord[] = [];
  for (const segment of segments) {
    if (typeof segment === "string") {
      const parts = segment.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) continue;
        words.push({ text: part, gradient: null });
      }
    } else {
      // gradient segment stays as a single token
      words.push({ text: segment.gradient, gradient: segment.gradient });
    }
  }
  return words;
}

export function ScrollHighlightText({
  segments,
  className,
  fromColor = "#bcbcbf",
  toColor = "#2e2e2e",
  finishAt = 0.7,
}: ScrollHighlightTextProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.4"],
  });

  const words = useMemo(() => flatten(segments), [segments]);

  return (
    <h2 ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <Word
            text={word.text}
            gradient={word.gradient}
            index={i}
            total={words.length}
            progress={scrollYProgress}
            reduce={!!reduce}
            fromColor={fromColor}
            toColor={toColor}
            finishAt={finishAt}
          />
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </h2>
  );
}

interface WordProps {
  text: string;
  gradient: string | null;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduce: boolean;
  fromColor: string;
  toColor: string;
  finishAt: number;
}

function Word({
  text,
  gradient,
  index,
  total,
  progress,
  reduce,
  fromColor,
  toColor,
  finishAt,
}: WordProps) {
  // Each word activates in a small window. Windows overlap slightly so
  // the wave feels continuous rather than stepped.
  const step = finishAt / total;
  const start = Math.max(0, index * step);
  const end = Math.min(1, start + step * 1.6);

  const color = useTransform(progress, [start, end], [fromColor, toColor]);
  const opacity = useTransform(progress, [start, end], [0.55, 1]);

  if (gradient) {
    return (
      <motion.span
        style={reduce ? { opacity: 1 } : { opacity }}
        className="inline-block bg-clip-text text-transparent [background-image:var(--gradient-brand-strong)]"
      >
        {text}
      </motion.span>
    );
  }

  return (
    <motion.span
      style={reduce ? { color: toColor } : { color }}
      className="inline-block"
    >
      {text}
    </motion.span>
  );
}
