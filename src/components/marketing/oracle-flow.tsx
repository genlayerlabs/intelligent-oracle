"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, type ComponentType, type SVGProps } from "react";
import { Bot, CheckCircle2, WalletCards, Workflow } from "lucide-react";

interface Step {
  index: number;
  title: string;
  eyebrow: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  Frame: ComponentType;
}

const steps: Step[] = [
  {
    index: 0,
    title: "Describe",
    eyebrow: "Step one",
    description: "Start with a market question in plain English. The assistant interprets your intent.",
    icon: Bot,
    Frame: FrameDescribe,
  },
  {
    index: 1,
    title: "Define",
    eyebrow: "Step two",
    description: "The assistant drafts outcomes, rules, evidence sources, and resolution timing.",
    icon: CheckCircle2,
    Frame: FrameDefine,
  },
  {
    index: 2,
    title: "Deploy",
    eyebrow: "Step three",
    description: "Your connected wallet signs and the oracle goes live on GenLayer.",
    icon: WalletCards,
    Frame: FrameDeploy,
  },
  {
    index: 3,
    title: "Resolve",
    eyebrow: "Step four",
    description: "Validators evaluate live evidence and publish the consensus outcome.",
    icon: Workflow,
    Frame: FrameResolve,
  },
];

export function OracleFlow() {
  return (
    <>
      <DesktopFlow />
      <MobileFlow />
    </>
  );
}

function DesktopFlow() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <div
      ref={sectionRef}
      className="relative hidden md:block"
      style={{ height: "320vh" }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="relative w-full px-[5%]">
          <div className="mx-auto grid w-full max-w-[1300px] grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16">
            <div className="relative flex items-center justify-center">
              <div className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_30px_60px_-30px_rgba(40,43,93,0.25)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand-lavender)_18%,transparent),transparent_55%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_85%,color-mix(in_oklab,var(--brand-pink)_14%,transparent),transparent_55%)]" />
                {steps.map((step) => (
                  <FrameWrapper
                    key={step.index}
                    progress={scrollYProgress}
                    index={step.index}
                    reduce={!!reduce}
                  >
                    <step.Frame />
                  </FrameWrapper>
                ))}
                <ProgressDots progress={scrollYProgress} reduce={!!reduce} />
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2.5">
              {steps.map((step) => (
                <StepCardSticky
                  key={step.index}
                  step={step}
                  progress={scrollYProgress}
                  reduce={!!reduce}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileFlow() {
  return (
    <div className="grid gap-4 md:hidden">
      {steps.map((step) => (
        <article
          key={step.index}
          className="overflow-hidden rounded-md border border-black/10 bg-white"
        >
          <div className="relative aspect-[5/3] bg-[color:var(--surface-muted)]">
            <step.Frame />
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <step.icon className="size-7 stroke-[1.4]" aria-hidden />
              <span className="font-mono text-xs text-black/50">
                0{step.index + 1}
              </span>
            </div>
            <h3 className="mt-5 text-2xl font-light">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/65">
              {step.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function FrameWrapper({
  progress,
  index,
  reduce,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  reduce: boolean;
  children: React.ReactNode;
}) {
  // Binary visibility: derive active index from progress, fade in/out.
  const opacity = useTransform(progress, (v) => {
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    if (idx === index) return 1;
    // soft fade at boundaries
    const center = (index + 0.5) / steps.length;
    const distance = Math.abs(v - center);
    if (distance < 1 / steps.length) {
      return Math.max(0, 1 - distance * steps.length * 2.2);
    }
    return 0;
  });

  return (
    <motion.div
      className="absolute inset-0"
      style={reduce ? { opacity: index === 0 ? 1 : 0 } : { opacity }}
    >
      {children}
    </motion.div>
  );
}

function ProgressDots({
  progress,
  reduce,
}: {
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const activeIndex = useTransform(progress, (v) => Math.min(3, Math.floor(v * 4)));

  if (reduce) return null;

  return (
    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
      {steps.map((step) => (
        <ProgressDot key={step.index} index={step.index} active={activeIndex} />
      ))}
    </div>
  );
}

function ProgressDot({
  index,
  active,
}: {
  index: number;
  active: MotionValue<number>;
}) {
  const opacity = useTransform(active, (v) => (v === index ? 1 : 0.25));
  const scale = useTransform(active, (v) => (v === index ? 1 : 0.7));
  return (
    <motion.div
      style={{ opacity, scale }}
      className="size-1.5 rounded-full bg-[color:var(--brand-lavender)]"
    />
  );
}

function StepCardSticky({
  step,
  progress,
  reduce,
}: {
  step: Step;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  const Icon = step.icon;
  const isActive = useTransform(progress, (v) => {
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    return idx === step.index ? 1 : 0;
  });
  const opacity = useTransform(isActive, (v) => 0.4 + v * 0.6);
  const borderColor = useTransform(
    isActive,
    (v) => `rgba(155,106,246,${0.08 + v * 0.62})`,
  );

  return (
    <motion.article
      style={reduce ? undefined : { opacity, borderColor }}
      className="rounded-md border bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <Icon className="size-7 stroke-[1.4]" aria-hidden />
        <span className="font-mono text-xs text-black/50">
          0{step.index + 1}
        </span>
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-black/45">
        {step.eyebrow}
      </p>
      <h3 className="mt-1 text-2xl font-light">{step.title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-black/65">
        {step.description}
      </p>
    </motion.article>
  );
}

// ----- Frame components -----

function FrameDescribe() {
  return (
    <div className="relative flex h-full w-full items-center justify-center p-10">
      <div className="w-full max-w-sm rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-[color:var(--brand-navy)]" />
          <span className="text-xs font-medium text-black/55">
            Oracle Assistant
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <Line width="92%" delay={0.0} />
          <Line width="74%" delay={0.15} />
          <Line width="56%" delay={0.3} />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-black/10 bg-[color:var(--surface-muted)] px-2.5 py-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--brand-pink)]" />
          <span className="text-xs text-black/65">drafting…</span>
        </div>
      </div>
    </div>
  );
}

function Line({ width, delay }: { width: string; delay: number }) {
  return (
    <motion.div
      className="h-2 rounded-full bg-[color:var(--brand-lavender)]/30"
      style={{ width }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    />
  );
}

function FrameDefine() {
  const chips = [
    { label: "Outcomes", color: "var(--brand-lavender)" },
    { label: "Rules", color: "var(--brand-pink)" },
    { label: "Sources", color: "var(--brand-blue)" },
    { label: "Timing", color: "var(--brand-navy)" },
  ];
  return (
    <div className="relative flex h-full w-full items-center justify-center p-10">
      <div className="w-full max-w-sm rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">
            Market draft
          </span>
          <CheckCircle2 className="size-5 text-[color:var(--brand-lavender)]" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chips.map((chip, i) => (
            <motion.div
              key={chip.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.08 }}
              className="flex items-center gap-2 rounded-sm border border-black/10 bg-[color:var(--surface-muted)] px-2.5 py-1.5"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: chip.color }}
              />
              <span className="text-xs text-black/70">{chip.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FrameDeploy() {
  return (
    <div className="relative flex h-full w-full items-center justify-center p-10">
      <div className="relative w-full max-w-sm">
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-md border border-black/10 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <WalletCards className="size-5 text-black/70" />
            <span className="text-xs font-medium text-black/65">
              Wallet signature
            </span>
          </div>
          <div className="mt-2 font-mono text-[11px] text-black/50">
            0x9b6a…f6e3
          </div>
        </motion.div>

        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[58%] h-12 w-px -translate-x-1/2 bg-gradient-to-b from-[color:var(--brand-lavender)] to-transparent"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          style={{ transformOrigin: "top" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-14 rounded-md border border-[color:var(--brand-lavender)] bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,transparent)] p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--brand-navy)]">
              Oracle deployed
            </span>
            <span className="size-2 animate-pulse rounded-full bg-[color:var(--brand-lavender)]" />
          </div>
          <div className="mt-2 font-mono text-[11px] text-black/55">
            0x3f2a…b7c9
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FrameResolve() {
  const validators = Array.from({ length: 5 }, (_unused, i) => i);
  return (
    <div className="relative flex h-full w-full items-center justify-center p-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">
            Validators
          </span>
          <span className="text-xs text-black/55">5 / 5 agree</span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          {validators.map((v) => (
            <motion.div
              key={v}
              initial={{ height: 8, opacity: 0.4 }}
              animate={{ height: 40 + v * 4, opacity: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.05 + v * 0.08,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="w-6 rounded-sm bg-[color:var(--brand-lavender)]/70"
              aria-hidden
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="mt-6 flex items-center justify-between rounded-md border border-[color:var(--brand-lavender)] bg-white p-4"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">
              Outcome
            </p>
            <p className="mt-1 text-lg font-light text-black/85">
              Resolved · YES
            </p>
          </div>
          <CheckCircle2 className="size-8 text-[color:var(--brand-lavender)]" />
        </motion.div>
      </div>
    </div>
  );
}
