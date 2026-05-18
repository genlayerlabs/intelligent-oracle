import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Braces,
  Building2,
  Eye,
  Gauge,
  Layers3,
  LineChart,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import {
  Reveal,
  RevealStagger,
  ScrollMarquee,
} from "@/components/marketing/motion";
import { OracleFlow } from "@/components/marketing/oracle-flow";
import { ValidatorDiagram } from "@/components/marketing/validator-diagram";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ScrollHighlightText } from "@/components/marketing/scroll-highlight-text";
import { cardSurface, type CardTone } from "@/components/marketing/cards";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Intelligent Oracle - The Resolution Layer for Prediction Markets",
  description:
    "Create intelligent oracles, monitor live market resolution, and resolve outcomes with AI validator consensus.",
};

const capabilities = [
  "AI Market Definition",
  "Live Web Evidence",
  "Validator Consensus",
  "Transparent Explorer",
  "Wallet-Native Deploy",
  "Open Source · MIT",
];

const benefits: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "AI-driven accuracy",
    description:
      "Validators interpret live web evidence with large language models and cross-check outcomes through GenLayer consensus.",
    icon: Bot,
  },
  {
    title: "Decentralized and transparent",
    description:
      "Every oracle exposes its market definition, resolution sources, transaction history, validator votes, and final outcome.",
    icon: ShieldCheck,
  },
  {
    title: "Scalable and flexible",
    description:
      "Create markets from plain English, deploy from your wallet, and resolve against either fixed sources or evidence URLs.",
    icon: Gauge,
  },
];

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: CardTone;
  className?: string;
}

const features: FeatureCard[] = [
  {
    title: "AI Agent for Oracle Creation",
    description:
      "Describe any market in plain English. The assistant drafts outcomes, rules, sources, and resolution timing — ready for your wallet to sign.",
    icon: Sparkles,
    tone: "dark",
    className: "md:row-span-2 md:col-span-2",
  },
  {
    title: "Cross-chain Interoperability",
    description:
      "Plugs into prediction markets, insurance protocols, and governance flows across EVM chains.",
    icon: Layers3,
    tone: "lavender",
  },
  {
    title: "Explorer",
    description:
      "Inspect every market, evidence URL, validator vote, and final outcome from a single live view.",
    icon: Eye,
    tone: "white",
  },
  {
    title: "Human Appeals",
    description:
      "Disputed outcomes can escalate to human reviewers without losing the chain-of-evidence record.",
    icon: Scale,
    tone: "pink",
    className: "md:row-span-2",
  },
  {
    title: "Open Source · MIT",
    description:
      "Intelligent Oracle is MIT-licensed. Read the code, run it locally, or fork it for your own protocol.",
    icon: Braces,
    tone: "lavender",
    className: "md:col-span-2",
  },
];

const useCases: Array<{
  title: string;
  text: string;
  icon: LucideIcon;
  tone: CardTone;
}> = [
  {
    title: "Prediction Markets",
    text: "Resolve sports, politics, product rankings, weather, and live-event markets without manual adjudication.",
    icon: TrendingUp,
    tone: "lavender",
  },
  {
    title: "Insurance",
    text: "Trigger parametric insurance flows from web evidence such as weather events, travel disruptions, or public records.",
    icon: ShieldCheck,
    tone: "pink",
  },
  {
    title: "Governance",
    text: "Let protocols update parameters from real-world signals while keeping the evidence trail inspectable.",
    icon: Building2,
    tone: "white",
  },
  {
    title: "Financial Derivatives",
    text: "Settle event-based instruments tied to web-accessible facts beyond traditional price feeds.",
    icon: LineChart,
    tone: "lavender",
  },
];

const faqs = [
  {
    question: "What is the Intelligent Oracle?",
    answer:
      "Intelligent Oracle is a system for creating and monitoring AI-resolved oracle markets, powered by GenLayer. Users define a market, deploy it from a wallet, and inspect resolution through the explorer.",
  },
  {
    question: "How is it different from traditional oracles?",
    answer:
      "It can evaluate open-ended web evidence instead of relying only on pre-defined feeds. GenLayer validators independently reason about the result and compare outputs through consensus.",
  },
  {
    question: "What can I build with it?",
    answer:
      "Prediction markets are the current reference flow, but the same oracle pattern can support insurance triggers, governance automation, and other applications that need live web facts.",
  },
  {
    question: "Where do I start?",
    answer:
      "Use the assistant to draft an oracle, connect a wallet, create it on GenLayer, then monitor or resolve it from the explorer.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f1f0f3] text-[#2e2e2e]">
      <PublicHeader active="home" revealOnScroll />

      <main>
        {/* HERO — dark, vortex backdrop, capability marquee pinned to bottom */}
        <section className="brand-navy-bloom relative isolate flex min-h-[100svh] flex-col overflow-hidden text-white">
          {/* Spirograph vortex — large, right-aligned, screen-blended so the gradient blooms tint through */}
          <Image
            src="/brand/textures/circle-vortex.avif"
            alt=""
            aria-hidden
            width={2402}
            height={2567}
            priority
            className="pointer-events-none absolute right-[-22vw] top-1/2 z-0 h-[130vh] w-[130vh] max-w-none -translate-y-1/2 mix-blend-screen md:right-[-12vw] md:h-[120vh] md:w-[120vh] md:opacity-90"
          />
          {/* Soft inner gradient so the H1 reads cleanly over the vortex */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[color:var(--brand-navy)]/85 via-[color:var(--brand-navy)]/40 to-transparent"
          />

          <div className="relative z-10 mx-auto flex w-[90%] max-w-[1300px] flex-1 flex-col justify-center py-12 md:py-16">
            <Reveal y={12} duration={0.7}>
              <div className="mb-8 inline-flex items-center gap-3">
                <BrandMark className="size-7 text-white" />
                <span className="text-base font-medium tracking-tight text-white">
                  Intelligent Oracle
                </span>
                <span aria-hidden className="h-3.5 w-px bg-white/25" />
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">
                  by GenLayer
                </span>
              </div>
            </Reveal>
            <Reveal y={28} duration={0.8} delay={0.05}>
              <h1 className="max-w-5xl text-balance text-[clamp(3rem,8vw,7.5rem)] font-light leading-[0.98] tracking-normal text-white">
                The Resolution Layer for Tomorrow&apos;s Prediction Markets
              </h1>
            </Reveal>
            <Reveal y={16} duration={0.7} delay={0.18}>
              <p className="mt-8 max-w-2xl text-xl font-light leading-8 text-white/75">
                Design intelligent oracles in plain English, deploy them from your wallet, and inspect resolution from the live web.
              </p>
            </Reveal>
            <Reveal y={12} duration={0.6} delay={0.3}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-12 bg-white px-7 text-black hover:bg-[color:var(--brand-lavender)] hover:text-white"
                >
                  <Link href="/assistant">
                    Try It
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 border-white/30 bg-transparent px-7 text-white shadow-none hover:bg-white hover:text-black"
                >
                  <Link href="/docs">Get Started</Link>
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Capability marquee — pinned to bottom of hero so it's visible without scrolling */}
          <div
            className="relative z-10 flex min-h-16 items-center overflow-hidden bg-[color:var(--brand-lavender)] text-white"
            aria-label="Oracle capabilities"
          >
            <ScrollMarquee className="w-full py-5" duration={42}>
              {capabilities.map((label) => (
                <span
                  key={label}
                  className="flex shrink-0 items-center gap-12 text-sm font-medium uppercase tracking-[0.18em]"
                >
                  {label}
                  <span aria-hidden className="size-1 rounded-full bg-white/50" />
                </span>
              ))}
            </ScrollMarquee>
          </div>
        </section>

        {/* OVERVIEW — words darken left-to-right as you scroll through */}
        <section id="overview" className="mx-auto w-[90%] max-w-[1300px] py-24">
          <ScrollHighlightText
            className="max-w-6xl text-balance text-[clamp(2.25rem,5vw,5rem)] font-medium leading-[1.05]"
            segments={[
              "Intelligent Oracle is a decentralized data oracle system that brings real-world information into blockchain applications using",
              { gradient: "AI." },
            ]}
          />
        </section>

        {/* BENEFITS */}
        <section className="mx-auto grid w-[90%] max-w-[1300px] gap-10 pb-20 pt-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Reveal>
            <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-medium leading-none">
              Benefits &amp;
              <br />
              Key Features
            </h2>
          </Reveal>
          <RevealStagger className="border-t border-black">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="grid gap-6 border-b border-black py-10 md:grid-cols-[16rem_1fr]"
                >
                  <div className="flex flex-col items-start gap-5">
                    <Icon className="size-16 stroke-[1.25]" aria-hidden />
                    <h3 className="text-2xl font-light leading-tight">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="text-lg font-light leading-8 text-black/65">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </RevealStagger>
        </section>

        {/* FEATURES BENTO */}
        <section className="mx-auto w-[90%] max-w-[1300px] pb-24">
          <div className="grid auto-rows-[minmax(11rem,auto)] gap-3 md:grid-cols-5">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isDark = feature.tone === "dark";
              return (
                <Reveal key={feature.title} className={feature.className}>
                  <article
                    className={cn(
                      "group flex h-full flex-col justify-between gap-6 p-7 transition-[transform,box-shadow] duration-500 hover:-translate-y-0.5",
                      cardSurface(feature.tone),
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-12 stroke-[1.2] transition-transform duration-500 group-hover:scale-110",
                        isDark
                          ? "text-[color:var(--brand-lavender)]"
                          : "text-black",
                      )}
                      aria-hidden
                    />
                    <div>
                      <h3
                        className={cn(
                          "max-w-md text-2xl font-light leading-tight",
                          isDark ? "text-white" : "text-[#2e2e2e]",
                        )}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-3 max-w-md text-sm leading-6",
                          isDark ? "text-white/70" : "text-black/65",
                        )}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS — sticky-scroll centerpiece */}
        <section
          id="how-it-works"
          className="brand-navy-bloom py-16 text-white md:py-0"
        >
          <div className="relative mx-auto w-[90%] max-w-[1300px] pb-16 pt-16 md:pb-24 md:pt-24">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
                The flow
              </p>
              <h2 className="mt-3 max-w-3xl text-[clamp(2rem,4vw,4rem)] font-medium leading-[1.02]">
                How Intelligent Oracle works
              </h2>
            </Reveal>
          </div>
          <div className="bg-[#f1f0f3] text-[#2e2e2e]">
            <OracleFlow />
          </div>
        </section>

        {/* WHY GENLAYER */}
        <section className="mx-auto grid w-[90%] max-w-[1300px] gap-12 py-28 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <Reveal>
            <ValidatorDiagram className="aspect-[5/3.4] w-full overflow-hidden rounded-md border border-black/10 bg-white/60 p-6" />
          </Reveal>
          <div>
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45">
                Why GenLayer
              </p>
              <h2 className="mt-3 text-[clamp(2.25rem,4vw,4.5rem)] font-medium leading-[1.02]">
                Intelligent contracts that reason about the world
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-2xl text-lg font-light leading-8 text-black/65">
                GenLayer lets intelligent contracts call AI inside consensus. A
                lead validator proposes a result, validators compare equivalent
                outputs, and the transaction history stays available for
                inspection.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <Button
                asChild
                className="mt-8 bg-black text-white hover:bg-[color:var(--brand-lavender)]"
              >
                <Link href="/docs">Learn more</Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* USE CASES */}
        <section id="use-cases" className="mx-auto w-[90%] max-w-[1300px] py-24">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45">
              No limits to innovation
            </p>
            <h2 className="mt-3 text-[clamp(2.25rem,5vw,5rem)] font-medium leading-none">
              Use Cases
            </h2>
          </Reveal>
          <RevealStagger className="mt-10 grid gap-3 md:grid-cols-2">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              const isDark = useCase.tone === "dark";
              return (
                <article
                  key={useCase.title}
                  className={cn(
                    "flex min-h-64 flex-col justify-between p-8 transition-transform duration-500 hover:-translate-y-0.5",
                    cardSurface(useCase.tone),
                  )}
                >
                  <Icon
                    className={cn(
                      "size-10 stroke-[1.25]",
                      isDark ? "text-white" : "text-black",
                    )}
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-3xl font-light">{useCase.title}</h3>
                    <p
                      className={cn(
                        "mt-4 text-lg font-light leading-8",
                        isDark ? "text-white/75" : "text-black/65",
                      )}
                    >
                      {useCase.text}
                    </p>
                  </div>
                </article>
              );
            })}
          </RevealStagger>
        </section>

        {/* DUAL CTA: Docs + Explorer */}
        <section className="mx-auto grid w-[90%] max-w-[1300px] gap-4 py-10 md:grid-cols-2">
          <CtaTile
            href="/docs"
            title="Read Docs"
            text="Learn how the assistant, factory contract, explorer, and resolution flow fit together."
            icon={ArrowRight}
          />
          <CtaTile
            href="/explorer"
            title="Open Explorer"
            text="Monitor registered markets, resolution status, and validator transaction details."
            icon={Search}
          />
        </section>

        {/* FAQ */}
        <section className="mx-auto w-[90%] max-w-[1300px] py-24">
          <Reveal>
            <h2 className="text-[clamp(2.25rem,5vw,5rem)] font-medium leading-none">
              FAQs
            </h2>
          </Reveal>
          <div className="mt-10">
            <FaqAccordion items={faqs} />
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function CtaTile({
  href,
  title,
  text,
  icon: Icon,
}: {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group relative isolate flex min-h-72 flex-col justify-between overflow-hidden p-8 text-black no-underline bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,transparent)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background-image:var(--gradient-brand)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay [background:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_60%)]"
      />
      <div className="transition-colors duration-500 group-hover:text-white">
        <h2 className="text-4xl font-light">{title}</h2>
        <p className="mt-4 text-lg font-light leading-8 text-black/65 transition-colors duration-500 group-hover:text-white/85">
          {text}
        </p>
      </div>
      <Icon
        className="size-12 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-white"
        aria-hidden
      />
    </Link>
  );
}
