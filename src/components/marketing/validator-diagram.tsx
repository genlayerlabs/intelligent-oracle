"use client";

import { motion, useReducedMotion } from "motion/react";
import { BrandMark } from "@/components/brand/brand-mark";

const NODE_WIDTH = 124;
const NODE_HEIGHT = 56;
const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 380;

const nodes = [
  { id: "market", label: "Market", x: 32, y: 32 },
  { id: "evidence", label: "Evidence", x: VIEW_WIDTH - NODE_WIDTH - 32, y: 32 },
  { id: "validators", label: "Validators", x: 32, y: VIEW_HEIGHT - NODE_HEIGHT - 32 },
  {
    id: "outcome",
    label: "Outcome",
    x: VIEW_WIDTH - NODE_WIDTH - 32,
    y: VIEW_HEIGHT - NODE_HEIGHT - 32,
  },
] as const;

const center = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };

function nodeRightEdge(node: { x: number; y: number }) {
  return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
}
function nodeLeftEdge(node: { x: number; y: number }) {
  return { x: node.x, y: node.y + NODE_HEIGHT / 2 };
}
function nodeBottomEdge(node: { x: number; y: number }) {
  return { x: node.x + NODE_WIDTH / 2, y: node.y + NODE_HEIGHT };
}
function nodeTopEdge(node: { x: number; y: number }) {
  return { x: node.x + NODE_WIDTH / 2, y: node.y };
}

const connections = [
  // market -> mark (top-left into center)
  {
    from: nodeBottomEdge(nodes[0]),
    to: { x: center.x - 28, y: center.y - 12 },
    delay: 0.15,
  },
  // evidence -> mark (top-right into center)
  {
    from: nodeBottomEdge(nodes[1]),
    to: { x: center.x + 28, y: center.y - 12 },
    delay: 0.3,
  },
  // mark -> validators (center to bottom-left)
  {
    from: { x: center.x - 28, y: center.y + 12 },
    to: nodeTopEdge(nodes[2]),
    delay: 0.55,
  },
  // mark -> outcome (center to bottom-right)
  {
    from: { x: center.x + 28, y: center.y + 12 },
    to: nodeTopEdge(nodes[3]),
    delay: 0.7,
  },
  // validators -> outcome (horizontal at bottom)
  {
    from: nodeRightEdge(nodes[2]),
    to: nodeLeftEdge(nodes[3]),
    delay: 0.9,
  },
];

function buildPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx1 = from.x + dx * 0.4;
  const cy1 = from.y + dy * 0.1;
  const cx2 = from.x + dx * 0.6;
  const cy2 = from.y + dy * 0.9;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

export function ValidatorDiagram({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vd-conn" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--brand-lavender)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--brand-pink)" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="vd-center-glow">
            <stop offset="0%" stopColor="var(--brand-lavender)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--brand-lavender)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <motion.circle
          cx={center.x}
          cy={center.y}
          r="76"
          fill="url(#vd-center-glow)"
          initial={reduce ? { opacity: 0.35 } : { opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 1.2, delay: 0.2 }}
        />

        {connections.map((c, i) => (
          <motion.path
            key={i}
            d={buildPath(c.from, c.to)}
            fill="none"
            stroke="url(#vd-conn)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={reduce ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.9 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{
              pathLength: { duration: 1.1, delay: c.delay, ease: [0.21, 0.47, 0.32, 0.98] },
              opacity: { duration: 0.4, delay: c.delay },
            }}
          />
        ))}

        {connections.map((c, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={c.to.x}
            cy={c.to.y}
            r="3.5"
            fill="var(--brand-lavender)"
            initial={reduce ? { opacity: 0.8 } : { opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.3, delay: c.delay + 1.0 }}
          />
        ))}

        {nodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <rect
              x={node.x}
              y={node.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx="6"
              fill="white"
              stroke="rgba(10,10,20,0.12)"
              strokeWidth="1"
            />
            <text
              x={node.x + NODE_WIDTH / 2}
              y={node.y + NODE_HEIGHT / 2 + 5}
              textAnchor="middle"
              fontSize="14"
              fill="rgba(10,10,20,0.7)"
              fontWeight="500"
              fontFamily="inherit"
            >
              {node.label}
            </text>
          </motion.g>
        ))}

        <motion.g
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.55, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <rect
            x={center.x - 38}
            y={center.y - 38}
            width="76"
            height="76"
            rx="10"
            fill="var(--brand-navy)"
          />
        </motion.g>
        <motion.g
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.4, delay: 0.65 }}
          transform={`translate(${center.x - 20}, ${center.y - 19})`}
        >
          <foreignObject width="40" height="38">
            <div
              style={{
                width: 40,
                height: 38,
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrandMark style={{ width: 32, height: 30 }} />
            </div>
          </foreignObject>
        </motion.g>
      </svg>
    </div>
  );
}
