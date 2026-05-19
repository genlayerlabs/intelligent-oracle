import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { AgentQuickstartTabs } from "@/components/marketing/agent-quickstart-tabs";
import { DocsCodeBlock } from "@/components/marketing/docs-code-block";
import { PublicFooter, PublicHeader } from "@/components/marketing/public-shell";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SITE_GITHUB_URL } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "Get started - Intelligent Oracle",
  description:
    "Try the assistant or fork the repo and deploy your own intelligent oracles on GenLayer.",
};

const repoName = SITE_GITHUB_URL.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").split("/").pop() ?? "intelligent-oracle";

const cloneCommand = `git clone ${SITE_GITHUB_URL}
cd ${repoName}
npm install`;

const envSetupCommand = `cp .env.example .env`;

const runCommand = `npm run dev`;

const deployCommand = `cd scripts
npm install
cp .env.example .env
npm run deploy`;

const routeMap = `/
/assistant
/explorer
/oracle/[address]
/docs
/api/chat`;

const envExample = `# Server-only
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-5-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Bundled into the browser build
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...`;

const checkCommands = `npm run check

# Or individually
npm run lint
npm run typecheck
npm run test
npm run build`;

const contractCommands = `python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r test/requirements.txt
python -m pytest test/ -v

genvm-lint check intelligent-contracts/*.py`;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#f1f0f3] text-[#2e2e2e]">
      <PublicHeader active="docs" />

      <main className="mx-auto w-[90%] max-w-[1100px] pb-20 pt-[5.5rem]">
        {/* HERO */}
        <section className="max-w-3xl">
          <h1 className="text-balance text-[clamp(2.75rem,6vw,5.5rem)] font-light leading-[0.98]">
            Get started
          </h1>
          <p className="mt-7 text-xl font-light leading-9 text-black/65">
            This is a reference UI for GenLayer&apos;s intelligent oracles. Draft a prediction market in plain English, sign it from your wallet, and let validator consensus resolve it against live web evidence. Use it as-is, or fork the repo and ship your own.
          </p>
        </section>

        {/* PRIMARY PATH — Human / Agent tabs */}
        <section className="mt-10 md:mt-12">
          <AgentQuickstartTabs />
        </section>

        {/* SECONDARY PATH — FORK */}
        <section className="mt-24">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-black/45">
            Build your own
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.5rem)] font-medium leading-tight">
            Fork and deploy
          </h2>
          <p className="mt-5 max-w-3xl text-lg font-light leading-8 text-black/65">
            Run the app locally against hosted GenLayer Studio, then deploy your own factory contract when you&apos;re ready.
          </p>

          <ol className="mt-10 flex flex-col gap-8">
            <ForkStep number={1} title="Clone and install">
              <DocsCodeBlock code={cloneCommand} language="bash" title="Terminal" />
            </ForkStep>
            <ForkStep number={2} title="Configure environment">
              <p>
                Copy the example file and fill in your OpenRouter key, GenLayer RPC URL, and the factory address you&apos;ll deploy in step 4 (or a shared one).
              </p>
              <DocsCodeBlock code={envSetupCommand} language="bash" title="Terminal" />
            </ForkStep>
            <ForkStep number={3} title="Run locally">
              <DocsCodeBlock code={runCommand} language="bash" title="Terminal" />
            </ForkStep>
            <ForkStep number={4} title="Deploy your own factory (optional)">
              <p>
                The factory deploy script is a separate npm package. It publishes a new oracle factory under your control and prints the address to paste into{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                  NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS
                </code>
                .
              </p>
              <DocsCodeBlock code={deployCommand} language="bash" title="Terminal" />
            </ForkStep>
          </ol>

          <a
            href={SITE_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[#9733fa] hover:text-black"
          >
            View on GitHub
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </section>

        {/* REFERENCE — collapsed */}
        <section className="mt-24">
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-medium leading-tight">
            Reference
          </h2>
          <p className="mt-5 max-w-3xl text-lg font-light leading-8 text-black/65">
            Operational details you&apos;ll want once you&apos;re building.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <RefSection title="Routes">
              <p>The app exposes these routes. Everything lives under one Next.js project.</p>
              <DocsCodeBlock code={routeMap} language="bash" title="Route map" />
            </RefSection>

            <RefSection title="Environment variables">
              <p>
                Server-only values stay private.{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                  NEXT_PUBLIC_*
                </code>{" "}
                values are bundled into the browser build.
              </p>
              <DocsCodeBlock code={envExample} language="bash" title=".env" />
            </RefSection>

            <RefSection title="Contract methods the app calls">
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <strong className="font-medium text-black">Registry</strong> &mdash;{" "}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                    create_new_prediction_market
                  </code>
                  ,{" "}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                    get_contract_addresses
                  </code>
                </li>
                <li>
                  <strong className="font-medium text-black">Oracle</strong> &mdash;{" "}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                    resolve
                  </code>
                  ,{" "}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                    get_dict
                  </code>
                  ,{" "}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
                    get_status
                  </code>
                </li>
              </ul>
              <p>
                If you change either contract&apos;s ABI, update the deploy script and the front-end hooks in the same change.
              </p>
            </RefSection>

            <RefSection title="Verification commands">
              <p>
                Front-end checks &mdash; one command runs lint, types, tests, and a production build.
              </p>
              <DocsCodeBlock code={checkCommands} language="bash" title="Front-end" />
              <p>
                Contract tests run against the intelligent contracts directly.
              </p>
              <DocsCodeBlock code={contractCommands} language="bash" title="Contracts" />
            </RefSection>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function ForkStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-4 md:grid-cols-[3rem_minmax(0,1fr)]">
      <div className="flex size-12 items-center justify-center rounded-md bg-[#9733fa1a] text-lg font-medium text-[#9733fa]">
        {number}
      </div>
      <div className="flex flex-col gap-4 text-base font-light leading-7 text-black/65">
        <h3 className="text-xl font-medium leading-tight text-black">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function RefSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Collapsible className="rounded-md border border-black/10 bg-white/45">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-black">
        {title}
        <ChevronDown
          className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 border-t border-black/10 px-5 py-5 text-sm leading-7 text-black/65">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
