"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
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
  const { openConnectModal } = useConnectModal();
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
      openConnectModal?.();
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
      openConnectModal?.();
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
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader active="explorer" />

      <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3">
              {oracle?.status ? <StatusBadge status={oracle.status} /> : null}
            </div>
            <h1 className="break-words text-2xl font-semibold text-foreground">
              {oracle?.title || "Oracle details"}
            </h1>
            <p className="mt-2 break-all font-mono text-sm text-muted-foreground">
              <AddressText address={address} showFull />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void refreshOracle()} disabled={!ready || loading}>
              {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
              Refresh
            </Button>
            <Button type="button" onClick={openResolution} disabled={!oracle || resolving}>
              {resolving ? <Spinner /> : <Rocket className="size-4" aria-hidden />}
              {resolving ? "Resolving" : "Initiate resolution"}
            </Button>
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
          <div className="mt-6 flex min-h-72 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm text-muted-foreground">
            {ready ? (
              <>
                <Spinner />
                Loading oracle details
              </>
            ) : (
              <div className="max-w-md text-center">
                <p className="font-medium text-foreground">Factory configuration required</p>
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
            <section className="rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b border-border p-5">
                <h2 className="text-lg font-semibold">Market</h2>
                <p className="mt-2 text-sm text-muted-foreground">{oracle.description || "No description"}</p>
              </div>
              <dl className="divide-y divide-border">
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

            <section className="rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="text-lg font-semibold">Transactions</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{transactions.length} records</p>
                </div>
              </div>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3">
                {transactions.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
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
                      className="block w-full rounded-md border border-border bg-background p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm font-medium text-primary">{transactionId(tx)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{transactionType(tx)} transaction</p>
                        </div>
                        <StatusBadge status={String(tx.statusName || tx.status || "Unknown")} />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
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
            <Button type="button" variant="outline" onClick={() => setResolutionOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitResolution(resolutionEvidence)} disabled={resolving || !resolutionEvidence.trim()}>
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

        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
          {(["overview", "consensus", "validators", "raw"] as TransactionTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTabChange(item)}
              className={`h-8 rounded px-3 text-sm capitalize transition ${
                tab === item ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
              <div className="rounded-md border border-border p-4 md:col-span-2">
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
              <div className="rounded-md border border-border p-4 text-sm">
                <p><span className="text-muted-foreground">Leader:</span> {String(leaderReceipt?.node_config?.address || "Unknown")}</p>
                <p className="mt-1"><span className="text-muted-foreground">Execution:</span> {leaderReceipt?.execution_result || "Unknown"}</p>
                <p className="mt-1"><span className="text-muted-foreground">Vote:</span> {leaderReceipt?.vote || "No vote"}</p>
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
                <div key={`${participant.mode}-${participant.node_config.address || index}`} className="rounded-md border border-border p-4 text-sm">
                  <p className="font-medium capitalize">{participant.mode}</p>
                  <p className="mt-2 break-all"><span className="text-muted-foreground">Address:</span> {participant.node_config.address || "Unknown"}</p>
                  <p className="mt-1"><span className="text-muted-foreground">Vote:</span> {participant.vote || "No vote"}</p>
                  <p className="mt-1"><span className="text-muted-foreground">Execution:</span> {participant.execution_result || "Unknown"}</p>
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
            <Button type="button" variant="outline" onClick={() => void onCopy(transaction)}>
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
          <div key={key} className="rounded-md border border-border p-4 text-sm">
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
    <div className="rounded-md border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
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
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-sm text-foreground sm:col-span-2 ${multiline ? "whitespace-pre-wrap break-words" : ""}`}>
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
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground sm:col-span-2">
        {values && values.length > 0 ? (
          <ul className="space-y-2">
            {values.map((value) => (
              <li key={value} className="break-words rounded-md bg-muted px-3 py-2">
                {linkValues ? (
                  <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {value}
                  </a>
                ) : value}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">{emptyText}</span>
        )}
      </dd>
    </div>
  );
}
