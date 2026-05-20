"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "https://intelligentoracle.com";

const COPY_FEEDBACK_MS = 2000;

function buildPaste(origin: string) {
  return `Read ${origin}/skill.md and help me create an Intelligent Oracle`;
}

export function AgentQuickstartTabs() {
  const [origin, setOrigin] = useState(FALLBACK_SITE_URL);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const basePaste = buildPaste(origin);

  const copy = useCallback(async (text: string, id: string) => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, COPY_FEEDBACK_MS);
    } catch {
      // Clipboard access denied — silently fall back. Users can still
      // select-and-copy the visible text.
    }
  }, []);

  return (
    <Tabs defaultValue="human" className="flex flex-col gap-6">
      <TabsList className="flex w-fit items-center gap-2 border-b border-black/10">
        <TabTrigger value="human" label="Human" />
        <TabTrigger value="agent" label="Agent" />
      </TabsList>

      <TabsContent
        value="human"
        forceMount
        className="mt-0 data-[state=inactive]:hidden focus-visible:outline-none"
      >
        <article className="group relative isolate flex min-h-[28rem] flex-col overflow-hidden bg-[color:color-mix(in_oklab,var(--brand-lavender)_10%,transparent)] p-10 md:min-h-[32rem] md:p-14">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background-image:var(--gradient-brand)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay [background:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_60%)]"
          />
          <div className="transition-colors duration-500 group-hover:text-white">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45 transition-colors duration-500 group-hover:text-white/80">
              Try it now
            </p>
            <h2 className="mt-3 max-w-2xl text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight">
              Draft your first market in plain English
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-black/65 transition-colors duration-500 group-hover:text-white/85">
              Open the assistant and describe a market that can be settled by
              public web evidence. You&apos;ll review the outcomes, rules,
              sources, and resolution date before signing anything.
            </p>
            <Button
              asChild
              className="mt-8 h-12 bg-black px-7 text-white transition-colors duration-500 group-hover:bg-white group-hover:text-black"
            >
              <Link href="/assistant">
                Open the Assistant
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </article>
      </TabsContent>

      <TabsContent
        value="agent"
        forceMount
        className="mt-0 data-[state=inactive]:hidden focus-visible:outline-none"
      >
        <article className="relative isolate flex min-h-[28rem] flex-col overflow-hidden bg-[color:var(--brand-navy,#0b0c1a)] p-10 text-white md:min-h-[32rem] md:p-14">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(circle_at_20%_15%,color-mix(in_oklab,var(--brand-lavender)_55%,transparent),transparent_55%)]"
          />
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">
            Use with agents
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(2rem,4vw,3.5rem)] font-light leading-tight">
            Paste this into your agent to set up Intelligent Oracle
          </h2>
          <p className="mt-5 max-w-2xl text-lg font-light leading-8 text-white/65">
            Works in Claude Code, Cursor, Codex, or any chat agent that can
            fetch a URL. The skill teaches the agent the schema, source list,
            deploy call, and how to check resolution later.
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => copy(basePaste, "base")}
              className={cn(
                "group flex w-full items-center justify-between gap-4 rounded-md border border-white/15 bg-black/45 px-5 py-4 text-left font-mono text-sm leading-6 text-white/90 transition-colors hover:border-white/25 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-lavender)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--brand-navy,#0b0c1a)]",
              )}
              aria-label={
                copiedId === "base" ? "Copied to clipboard" : "Copy to clipboard"
              }
            >
              <span className="select-all break-all">{basePaste}</span>
              <span
                aria-hidden
                className={cn(
                  "flex items-center gap-1.5 rounded-sm border border-white/15 px-2 py-1 text-xs font-medium uppercase tracking-[0.18em] transition-colors",
                  copiedId === "base"
                    ? "border-[color:var(--brand-lavender)] bg-[color:var(--brand-lavender)] text-white"
                    : "text-white/60 group-hover:border-white/35 group-hover:text-white",
                )}
              >
                {copiedId === "base" ? (
                  <>
                    <Check className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </span>
            </button>
          </div>

          <a
            href="/skill.md"
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-white/65 transition-colors hover:text-white"
          >
            Or read the skill directly
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </article>
      </TabsContent>
    </Tabs>
  );
}

function TabTrigger({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative -mb-px px-3 py-2 text-sm font-medium uppercase tracking-[0.18em] text-black/45 transition-colors",
        "hover:text-black/75",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-lavender)] focus-visible:ring-offset-2",
        "data-[state=active]:text-black",
        "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-transparent after:transition-colors data-[state=active]:after:bg-black",
      )}
    >
      {label}
    </TabsTrigger>
  );
}
