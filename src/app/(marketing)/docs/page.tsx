import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { BundledLanguage } from "shiki";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe2,
  ListChecks,
  Network,
  Rocket,
  Route,
  Search,
  ShieldCheck,
  Terminal,
  WalletCards,
} from "lucide-react";
import { DocsCodeBlock } from "@/components/marketing/docs-code-block";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Docs - Intelligent Oracle",
  description:
    "Set up, run, and understand the consolidated Intelligent Oracle Next.js app, assistant, explorer, and GenLayer contracts.",
};

const installCommands = `npm install
npm run dev`;

const envExample = `OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-5-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# Legacy fallback during migration
NEXT_PUBLIC_IC_REGISTRY_ADDRESS=0x...`;

const routeMap = `/
/assistant
/explorer
/oracle/[address]
/docs
/api/chat`;

const checkCommands = `npm run check

# Individual root checks
npm run lint
npm run typecheck
npm run test
npm run build`;

const contractCommands = `python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r test/requirements.txt
python -m pytest test/ -v

genvm-lint check intelligent-contracts/*.py`;

const deployCommands = `cd scripts
npm install
cp .env.example .env
npm run deploy`;

const configShape = `{
  "title": "Will it snow in New York on Christmas Day?",
  "description": "Resolves YES if measurable snow is recorded in New York City on Christmas Day.",
  "potential_outcomes": ["YES", "NO"],
  "rules": ["Use official weather records when available."],
  "data_source_domains": ["weather.gov"],
  "resolution_urls": [],
  "earliest_resolution_date": "2026-12-26"
}`;

const sections = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Setup" },
  { id: "routes", label: "Routes" },
  { id: "assistant", label: "Assistant" },
  { id: "explorer", label: "Explorer" },
  { id: "contracts", label: "Contracts" },
  { id: "verification", label: "Verification" },
  { id: "deployment", label: "Deployment" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#f1f0f3] text-[#2e2e2e] dark:bg-[#f1f0f3] dark:text-[#2e2e2e]">
      <PublicHeader active="docs" />

      <main className="mx-auto grid w-[90%] max-w-[1300px] gap-10 py-16 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-black/45">Docs</p>
            <ScrollArea className="max-h-[calc(100svh-8rem)] pr-3">
              <nav className="flex flex-col gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    className="rounded-md px-3 py-2 text-sm text-black/60 transition hover:bg-black/5 hover:text-black"
                    href={`#${section.id}`}
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </ScrollArea>
          </div>
        </aside>

        <article className="min-w-0">
          <section id="overview" className="scroll-mt-28">
            <Badge className="border-0 bg-[#9733fa1a] text-[#9733fa]">Current Next.js app</Badge>
            <h1 className="mt-5 max-w-4xl text-balance text-[clamp(3rem,7vw,7rem)] font-light leading-[0.98]">
              Intelligent Oracle Docs
            </h1>
            <p className="mt-8 max-w-3xl text-xl font-light leading-9 text-black/65">
              This project is a single Next.js App Router application for creating and monitoring GenLayer intelligent oracles. The assistant drafts oracle configs, users deploy with their connected wallet, and the explorer tracks market state and resolution evidence.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <OverviewCard icon={Bot} title="Assistant" text="Plain-English market drafting backed by OpenRouter through the Vercel AI SDK." />
              <OverviewCard icon={Network} title="GenLayer" text="Wallet-signed oracle creation and resolution against intelligent contracts." />
              <OverviewCard icon={Search} title="Explorer" text="Registry browsing, oracle detail pages, validator votes, and transaction inspection." />
            </div>
          </section>

          <Separator className="my-14 bg-black/10" />

          <DocSection
            id="setup"
            eyebrow="Local setup"
            icon={Terminal}
            title="Run the consolidated app"
          >
            <p>
              Install root dependencies and start the Next dev server. The `scripts/` package is separate and should not be run unless you are intentionally deploying infrastructure.
            </p>
            <DocCodeBlock code={installCommands} language="bash" title="Terminal" />
            <p>
              Copy `.env.example` to `.env` and fill in the values below. OpenRouter values stay server-only, while GenLayer browser values are exposed with `NEXT_PUBLIC_`.
            </p>
            <DocCodeBlock code={envExample} language="bash" title=".env" />
          </DocSection>

          <DocSection
            id="routes"
            eyebrow="Public interface"
            icon={Route}
            title="Routes"
          >
            <p>
              The former subdomain experiences now live under one project. The root route is the marketing landing page, and the oracle builder lives at `/assistant`.
            </p>
            <DocCodeBlock code={routeMap} language="bash" title="Route map" />
            <div className="grid gap-3 md:grid-cols-2">
              <RouteCard href="/" title="Landing" text="Marketing page and oracle overview." />
              <RouteCard href="/assistant" title="Assistant" text="Create oracle configs and deploy with a wallet." />
              <RouteCard href="/explorer" title="Explorer" text="Browse registered markets and resolution state." />
              <RouteCard href="/docs" title="Docs" text="This current single-page guide." />
            </div>
          </DocSection>

          <DocSection
            id="assistant"
            eyebrow="Assistant flow"
            icon={Bot}
            title="Draft, validate, deploy"
          >
            <p>
              `/assistant` keeps the existing wizard behavior. `parseOracleDraft` powers field-level error display for present-but-malformed values, while `parseOracleConfig` gates deployment and paste-import. Empty untouched fields should not show strict-required errors.
            </p>
            <DocCodeBlock code={configShape} language="json" title="Oracle config shape" />
            <div className="grid gap-3 md:grid-cols-3">
              <SmallFact icon={FileText} title="Draft panel" text="Shows AI proposals, local edits, validation state, and copied JSON." />
              <SmallFact icon={WalletCards} title="Wallet create" text="Users sign create transactions from the connected browser wallet." />
              <SmallFact icon={Globe2} title="Sources" text="Domains and resolution URLs switch modes without clobbering inactive input." />
            </div>
          </DocSection>

          <DocSection
            id="explorer"
            eyebrow="Explorer flow"
            icon={Search}
            title="Monitor and resolve markets"
          >
            <p>
              `/explorer` reads the factory registry and lists markets with status, outcome, resolution date, and address search. `/oracle/[address]` shows market details, resolution summaries, transaction tabs, validator participants, and raw sanitized transaction data.
            </p>
            <p>
              If an oracle has fixed `resolution_urls`, resolution can be initiated directly. If it expects dynamic evidence, the detail page asks for an evidence URL before sending the wallet-signed `resolve` transaction.
            </p>
          </DocSection>

          <DocSection
            id="contracts"
            eyebrow="GenLayer boundary"
            icon={ShieldCheck}
            title="Contract and AI boundaries"
          >
            <p>
              Non-contract chat belongs in `/api/chat` using the Vercel AI SDK and OpenRouter. Contract resolution AI stays inside GenLayer contracts through `gl.nondet.exec_prompt` and equivalence principles.
            </p>
            <Collapsible className="rounded-md border border-black/10 bg-white/45">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium">
                Public contract methods the app depends on
                <ChevronDown className="size-4" aria-hidden />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-black/10 px-4 py-4 text-sm leading-7 text-black/65">
                Registry: `__init__`, `create_new_prediction_market`, `get_contract_addresses`. Oracle: `__init__`, `resolve`, `get_dict`, `get_status`. If these change, update the GenLayer hooks, deploy script, and Python tests together.
              </CollapsibleContent>
            </Collapsible>
            <div className="rounded-md border border-[#ffa200]/30 bg-[#ffa200]/10 p-4 text-sm leading-7 text-black/70">
              <div className="flex items-center gap-2 font-medium text-black">
                <AlertTriangle className="size-4" aria-hidden />
                ABI caution
              </div>
              <p className="mt-2">
                Do not move GenLayer resolution prompts into Next route handlers. The app may help define an oracle, but consensus resolution remains in the intelligent contracts.
              </p>
            </div>
          </DocSection>

          <DocSection
            id="verification"
            eyebrow="Quality gate"
            icon={ListChecks}
            title="Verification commands"
          >
            <p>
              Use `npm run check` for root UI/API verification. It runs lint, TypeScript, unit tests, and a production build.
            </p>
            <DocCodeBlock code={checkCommands} language="bash" title="Root checks" />
            <p>
              Python direct-mode contract tests and GenVM lint are separate because they exercise the intelligent contracts directly.
            </p>
            <DocCodeBlock code={contractCommands} language="bash" title="Contract checks" />
          </DocSection>

          <DocSection
            id="deployment"
            eyebrow="Factory deployment"
            icon={Rocket}
            title="Deploy only when intended"
          >
            <p>
              Factory deployment lives in `scripts/`, a separate npm package with deployment-specific environment and side effects. Run it only when intentionally changing deployed infrastructure.
            </p>
            <DocCodeBlock code={deployCommands} language="bash" title="Factory deployment" />
            <div className="flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#9733fa] hover:text-black" href="/assistant">
                Open assistant
                <ExternalLink className="size-4" aria-hidden />
              </Link>
              <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#9733fa] hover:text-black" href="/explorer">
                Open explorer
                <ExternalLink className="size-4" aria-hidden />
              </Link>
            </div>
          </DocSection>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}

function DocSection({
  id,
  eyebrow,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 py-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-[#9733fa1a] text-[#9733fa]">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">{eyebrow}</p>
      </div>
      <h2 className="max-w-3xl text-balance text-[clamp(2rem,4vw,4rem)] font-medium leading-none">{title}</h2>
      <div className="mt-7 flex flex-col gap-5 text-lg font-light leading-8 text-black/65">{children}</div>
    </section>
  );
}

function DocCodeBlock({
  code,
  language,
  title,
}: {
  code: string;
  language: BundledLanguage;
  title: string;
}) {
  return <DocsCodeBlock code={code} language={language} title={title} />;
}

function OverviewCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <article className="bg-[#9733fa1a] p-5">
      <Icon className="size-8 stroke-[1.4] text-[#9733fa]" aria-hidden />
      <h2 className="mt-8 text-2xl font-light text-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-black/60">{text}</p>
    </article>
  );
}

function RouteCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link className="block rounded-md border border-black/10 bg-white/45 p-4 text-black no-underline transition hover:border-black/30" href={href}>
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/60">{text}</p>
    </Link>
  );
}

function SmallFact({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-black/10 bg-white/45 p-4">
      <Icon className="size-6 text-[#9733fa]" aria-hidden />
      <p className="mt-5 font-medium text-black">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/60">{text}</p>
    </div>
  );
}
