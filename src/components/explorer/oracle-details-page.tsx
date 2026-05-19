"use client";

import { Copy, ExternalLink, RefreshCw, Rocket } from "lucide-react";
import type { Address } from "genlayer-js/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ai-elements/code-block";
import { AddressText } from "@/components/address";
import { AppHeader } from "@/components/app-header";
import { BrandMark } from "@/components/brand/brand-mark";
import { WaveDecoration } from "@/components/brand/wave-decoration";
import { ResolutionSummaryPanel } from "@/components/oracle/resolution-summary";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Oracle, Transaction } from "@/lib/types";
import {
  decodeBase64,
  decodeCalldata,
  formatKey,
  getNodeConfigParticipants,
  normalizeLeaderReceipt,
  parseEqOutput,
  sanitizeTransactionForDisplay,
} from "@/lib/transactions";
import { buildResolutionSummary } from "@/lib/resolution-timeline";
import { useGenLayer } from "@/lib/use-genlayer";
import { useOpenWalletConnection } from "@/lib/use-privy-wallet";

interface OracleDetailsPageProps {
  address: string;
}

type TransactionTab = "overview" | "consensus" | "validators" | "raw";

function formatDate(dateString?: string | Date) {
  if (!dateString) return "Not specified";
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function analysisText(analysis: Oracle["analysis"]) {
  if (!analysis) return "No analysis available";
  if (typeof analysis === "string") return analysis;
  const justification = analysis.justification || analysis.reasoning || analysis.raw;
  return typeof justification === "string" ? justification : "No analysis available";
}

function transactionId(transaction: Transaction) {
  return transaction.hash || transaction.txId || "Unknown transaction";
}

function transactionType(transaction: Transaction) {
  return transaction.data?.contract_address || transaction.txDataDecoded?.contractAddress ? "Creation" : "Resolution";
}

export function OracleDetailsPage({ address }: OracleDetailsPageProps) {
  const {
    ready,
    oracles,
    loading,
    lastError,
    walletConnected,
    fetchOracle,
    fetchTransactions,
    resolveOracle,
  } = useGenLayer();
  const openWalletConnection = useOpenWalletConnection("Connect your wallet to initiate oracle resolution.");
  const [oracle, setOracle] = useState<Oracle | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Each refresh allocates a new transactions array, so a naive [oracle, transactions]
  // dependency rebuilds the summary every 5s even when nothing actually changed.
  // Hash-join the transaction identities so reference churn doesn't cascade.
  const transactionsSignature = transactions
    .map((tx) => `${tx.hash ?? ""}:${tx.statusName ?? tx.status ?? ""}`)
    .join("|");
  const resolutionSummary = useMemo(
    () => (oracle ? buildResolutionSummary(oracle, transactions) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oracle, transactionsSignature],
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionTab, setTransactionTab] = useState<TransactionTab>("overview");
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionEvidence, setResolutionEvidence] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const cached = oracles.find((item) => item.address === address);
    if (cached) setOracle(cached);
  }, [address, oracles]);

  const refreshOracle = useCallback(async () => {
    if (!ready) return;
    const oracleAddress = address as Address;
    const [freshOracle, freshTransactions] = await Promise.all([
      fetchOracle(oracleAddress),
      fetchTransactions(oracleAddress),
    ]);
    setOracle(freshOracle);
    setTransactions(freshTransactions);
  }, [address, fetchOracle, fetchTransactions, ready]);

  useEffect(() => {
    if (!ready) return;

    // Stop polling once the oracle reaches a terminal state — Resolved or Error
    // are both final per IntelligentOracle.py. Without this guard every open
    // resolved-oracle tab burns RPC + battery every 5 seconds forever.
    const terminalStatus = oracle?.status === "Resolved" || oracle?.status === "Error";
    if (terminalStatus) return;

    let cancelled = false;
    const refresh = async () => {
      if (cancelled) return;
      await refreshOracle();
    };

    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [oracle?.status, ready, refreshOracle]);

  async function copyTransaction(transaction: Transaction) {
    await navigator.clipboard.writeText(JSON.stringify(transaction, null, 2));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(""), 1500);
  }

  function openResolution() {
    if (!walletConnected) {
      openWalletConnection();
      setResolutionError("Connect your wallet to initiate resolution.");
      return;
    }

    if (oracle?.resolution_urls && oracle.resolution_urls.length > 0) {
      void submitResolution("");
      return;
    }
    setResolutionEvidence("");
    setResolutionError("");
    setResolutionOpen(true);
  }

  async function submitResolution(evidence: string) {
    if (!walletConnected) {
      openWalletConnection();
      setResolutionError("Connect your wallet to submit resolution.");
      return;
    }

    try {
      setResolving(true);
      setResolutionError("");
      await resolveOracle(address as Address, evidence);
      await refreshOracle();
      setResolutionOpen(false);
      setResolutionEvidence("");
    } catch (error) {
      console.error("Error resolving oracle:", error);
      setResolutionError(error instanceof Error ? error.message : "Resolution failed.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="brand-app-shell relative isolate min-h-screen overflow-hidden text-[#2e2e2e] dark:text-white">
      <AppHeader active="explorer" />

      <WaveDecoration
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-20 -z-10 h-80 w-full opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent)] dark:opacity-20"
      />

      <main className="relative z-10 mx-auto w-[90%] min-w-0 max-w-[1300px] pb-12 pt-28">
        <header className="brand-surface relative isolate overflow-hidden rounded-md p-6 md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-1 bg-[image:var(--gradient-brand)]"
          />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="brand-icon-frame">
                  <BrandMark className="size-4" />
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                  Oracle details
                </span>
                {oracle?.status ? <StatusBadge status={oracle.status} /> : null}
              </div>
              <h1 className="break-words text-[clamp(2rem,5vw,4.5rem)] font-light leading-none tracking-normal text-black dark:text-white">
                {oracle?.title || "Oracle details"}
              </h1>
              <p className="mt-4 break-all font-mono text-xs text-black/55 dark:text-white/55 sm:text-sm">
                <AddressText address={address} showFull />
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void refreshOracle()} disabled={!ready || loading} className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
                {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                Refresh
              </Button>
              <Button type="button" onClick={openResolution} disabled={!oracle || resolving} className="bg-black text-white hover:bg-[color:var(--brand-lavender)] dark:bg-white dark:text-black dark:hover:bg-[color:var(--brand-lavender)] dark:hover:text-white">
                {resolving ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
                {resolving ? "Resolving" : "Initiate resolution"}
              </Button>
            </div>
          </div>
        </header>

        {lastError ? (
          <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {lastError}
          </div>
        ) : null}

        {resolutionError && !resolutionOpen ? (
          <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {resolutionError}
          </div>
        ) : null}

        {!oracle ? (
          <div className="brand-surface mt-6 flex min-h-72 items-center justify-center gap-2 rounded-md text-sm text-black/55 dark:text-white/55">
            {ready ? (
              <>
                <Spinner />
                Loading oracle details
              </>
            ) : (
              <div className="max-w-md text-center">
                <p className="font-medium text-black dark:text-white">Factory configuration required</p>
                <p className="mt-1">
                  Configure the factory address to load oracle details.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {resolutionSummary ? (
              <div className="mt-6">
                <ResolutionSummaryPanel summary={resolutionSummary} />
              </div>
            ) : null}

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="brand-surface overflow-hidden rounded-md">
              <div className="border-b border-black/10 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">Market</p>
                <h2 className="mt-1 text-2xl font-light text-black dark:text-white">Definition</h2>
                <p className="mt-3 text-sm leading-6 text-black/60 dark:text-white/60">{oracle.description || "No description"}</p>
              </div>
              <dl className="divide-y divide-black/10 dark:divide-white/10">
                <DetailRow label="Outcome" value={oracle.outcome || "Not yet determined"} />
                <DetailList label="Potential outcomes" values={oracle.potential_outcomes} />
                <DetailList label="Rules" values={oracle.rules} />
                <DetailList
                  label="Data source domains"
                  values={oracle.data_source_domains}
                  emptyText="This oracle uses fixed resolution URLs."
                />
                <DetailList
                  label="Resolution URLs"
                  values={oracle.resolution_urls}
                  emptyText="This oracle uses dynamic evidence URLs."
                  linkValues
                />
                <DetailRow label="Earliest resolution" value={formatDate(oracle.earliest_resolution_date)} />
                <DetailRow label="Analysis" value={analysisText(oracle.analysis)} multiline />
              </dl>
            </section>

            <section className="brand-surface overflow-hidden rounded-md">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">Consensus</p>
                  <h2 className="mt-1 text-2xl font-light text-black dark:text-white">Transactions</h2>
                  <p className="mt-1 text-sm text-black/55 dark:text-white/55">{transactions.length} records</p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3">
                {transactions.length === 0 ? (
                  <p className="rounded-md border border-dashed border-black/15 bg-white/45 p-5 text-sm text-black/55 dark:border-white/15 dark:bg-white/5 dark:text-white/55">
                    No transactions found for this oracle.
                  </p>
                ) : null}
                <div className="space-y-2">
                  {transactions.map((tx, index) => (
                    <button
                      type="button"
                      key={transactionId(tx) + index}
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setTransactionTab("overview");
                      }}
                      className="block w-full rounded-md border border-black/10 bg-white/60 p-4 text-left transition hover:border-[color:var(--brand-lavender)]/45 hover:bg-[color:color-mix(in_oklab,var(--brand-lavender)_8%,white)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-medium text-[color:var(--brand-blue)] dark:text-white">{transactionId(tx)}</p>
                          <p className="mt-1 text-xs text-black/55 dark:text-white/55">{transactionType(tx)} transaction</p>
                        </div>
                        <StatusBadge status={String(tx.statusName || tx.status || "Unknown")} />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-black/50 dark:text-white/50 sm:grid-cols-2">
                        <span>{formatDate(tx.created_at || tx.createdTimestamp)}</span>
                        <span>{tx.consensus_data?.votes ? `${Object.keys(tx.consensus_data.votes).length} votes` : "Leader execution"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
          </>
        )}
      </main>

      <TransactionDialog
        transaction={selectedTransaction}
        tab={transactionTab}
        copyStatus={copyStatus}
        onTabChange={setTransactionTab}
        onCopy={copyTransaction}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
      />

      <Dialog open={resolutionOpen} onOpenChange={setResolutionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide a URL for resolution</DialogTitle>
            <DialogDescription>
              This oracle uses dynamic evidence, so resolution requires a source URL.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={resolutionEvidence}
            onChange={(event) => setResolutionEvidence(event.currentTarget.value)}
            placeholder="https://example.com/result"
          />
          {resolutionError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {resolutionError}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResolutionOpen(false)} className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitResolution(resolutionEvidence)} disabled={resolving || !resolutionEvidence.trim()} className="bg-black text-white hover:bg-[color:var(--brand-lavender)] dark:bg-white dark:text-black dark:hover:bg-[color:var(--brand-lavender)] dark:hover:text-white">
              {resolving ? <Spinner /> : <ExternalLink className="size-4" aria-hidden />}
              Submit resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionDialog({
  transaction,
  tab,
  copyStatus,
  onTabChange,
  onCopy,
  onOpenChange,
}: {
  transaction: Transaction | null;
  tab: TransactionTab;
  copyStatus: string;
  onTabChange: (tab: TransactionTab) => void;
  onCopy: (transaction: Transaction) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const selectedTransactionObject = useMemo(() => sanitizeTransactionForDisplay(transaction), [transaction]);
  const leaderReceipt = useMemo(
    () => normalizeLeaderReceipt(selectedTransactionObject?.consensus_data?.leader_receipt),
    [selectedTransactionObject],
  );
  const participants = useMemo(() => getNodeConfigParticipants(selectedTransactionObject), [selectedTransactionObject]);
  const decodedCalldata = useMemo(
    () => decodeCalldata(selectedTransactionObject?.data?.calldata ?? selectedTransactionObject?.txDataDecoded),
    [selectedTransactionObject],
  );
  const prettyJson = useMemo(
    () => (selectedTransactionObject ? JSON.stringify(selectedTransactionObject, null, 2) : ""),
    [selectedTransactionObject],
  );

  return (
    <Dialog open={Boolean(transaction)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription className="break-all font-mono">
            {transaction ? transactionId(transaction) : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 rounded-md border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5">
          {(["overview", "consensus", "validators", "raw"] as TransactionTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTabChange(item)}
              className={`h-8 rounded px-3 text-sm capitalize transition ${
                tab === item ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          {tab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock label="Type" value={selectedTransactionObject ? transactionType(selectedTransactionObject) : "Unknown"} />
              <InfoBlock label="Status" value={String(selectedTransactionObject?.statusName || selectedTransactionObject?.status || "Unknown")} />
              <InfoBlock label="Created" value={formatDate(selectedTransactionObject?.created_at || selectedTransactionObject?.createdTimestamp)} />
              <InfoBlock label="Appealed" value={selectedTransactionObject?.appealed ? "Yes" : "No"} />
              <div className="rounded-md border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5 md:col-span-2">
                <p className="text-sm font-medium">Calldata</p>
                {decodedCalldata ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Method:</span> {decodedCalldata.method}</p>
                    {decodedCalldata.args ? (
                      <p className="break-all"><span className="text-muted-foreground">Arguments:</span> {decodedCalldata.args}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No calldata available</p>
                )}
              </div>
            </div>
          ) : null}

          {tab === "consensus" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-black/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <p><span className="text-black/55 dark:text-white/55">Leader:</span> {String(leaderReceipt?.node_config?.address || "Unknown")}</p>
                <p className="mt-1"><span className="text-black/55 dark:text-white/55">Execution:</span> {leaderReceipt?.execution_result || "Unknown"}</p>
                <p className="mt-1"><span className="text-black/55 dark:text-white/55">Vote:</span> {leaderReceipt?.vote || "No vote"}</p>
              </div>
              <EqOutputs outputs={leaderReceipt?.eq_outputs} />
            </div>
          ) : null}

          {tab === "validators" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No participants available.</p>
              ) : null}
              {participants.map((participant, index) => (
                <div key={`${participant.mode}-${participant.node_config.address || index}`} className="rounded-md border border-black/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                  <p className="font-medium capitalize">{participant.mode}</p>
                  <p className="mt-2 break-all"><span className="text-black/55 dark:text-white/55">Address:</span> {participant.node_config.address || "Unknown"}</p>
                  <p className="mt-1"><span className="text-black/55 dark:text-white/55">Vote:</span> {participant.vote || "No vote"}</p>
                  <p className="mt-1"><span className="text-black/55 dark:text-white/55">Execution:</span> {participant.execution_result || "Unknown"}</p>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "raw" ? (
            <CodeBlock code={prettyJson} language="json" showLineNumbers className="max-h-[58vh] overflow-auto">
              <CodeBlockHeader>
                <CodeBlockTitle>transaction.json</CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton />
                </CodeBlockActions>
              </CodeBlockHeader>
            </CodeBlock>
          ) : null}
        </div>

        <DialogFooter>
          {transaction ? (
            <Button type="button" variant="outline" onClick={() => void onCopy(transaction)} className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
              <Copy className="size-4" aria-hidden />
              {copyStatus || "Copy raw"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EqOutputs({ outputs }: { outputs?: Record<string, unknown> | unknown[] }) {
  if (!outputs || (Array.isArray(outputs) && outputs.length === 0)) {
    return <p className="text-sm text-muted-foreground">No equivalence outputs available.</p>;
  }

  const entries = Array.isArray(outputs)
    ? outputs.map((value, index) => [String(index), value] as const)
    : Object.entries(outputs);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Equivalence outputs</h3>
      {entries.map(([key, output]) => {
        const decoded = decodeBase64(String(output));
        const parsed = parseEqOutput(decoded);
        return (
          <div key={key} className="rounded-md border border-black/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="mb-3 font-medium">{formatKey(key)}</p>
            {parsed ? (
              <div className="space-y-2">
                {Object.entries(parsed).map(([parsedKey, value]) => (
                  <div key={parsedKey}>
                    <p className="text-muted-foreground">{formatKey(parsedKey)}</p>
                    <p className="mt-1 break-words">{String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="break-all text-muted-foreground">{decoded}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-sm text-black/55 dark:text-white/55">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-black dark:text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-black/50 dark:text-white/50">{label}</dt>
      <dd className={`text-sm text-black dark:text-white sm:col-span-2 ${multiline ? "whitespace-pre-wrap break-words" : ""}`}>
        {value || "Not specified"}
      </dd>
    </div>
  );
}

function DetailList({
  label,
  values,
  emptyText = "None",
  linkValues = false,
}: {
  label: string;
  values?: string[];
  emptyText?: string;
  linkValues?: boolean;
}) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-black/50 dark:text-white/50">{label}</dt>
      <dd className="text-sm text-black dark:text-white sm:col-span-2">
        {values && values.length > 0 ? (
          <ul className="space-y-2">
            {values.map((value) => (
              <li key={value} className="break-words rounded-md bg-black/5 px-3 py-2 dark:bg-white/5">
                {linkValues ? (
                  <a href={value} target="_blank" rel="noreferrer" className="text-[color:var(--brand-blue)] hover:underline dark:text-[color:var(--brand-lavender)]">
                    {value}
                  </a>
                ) : value}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-black/55 dark:text-white/55">{emptyText}</span>
        )}
      </dd>
    </div>
  );
}
