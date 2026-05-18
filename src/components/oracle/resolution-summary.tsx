"use client";

import { AlertCircle, Check, Globe2, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  ResolutionSource,
  ResolutionSummary,
  ResolutionValidator,
} from "@/lib/resolution-timeline";

interface ResolutionSummaryPanelProps {
  summary: ResolutionSummary;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return date.toLocaleString();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

function SourceChip({ source }: { source: ResolutionSource }) {
  const Icon = source.kind === "domain" ? Globe2 : Link2;
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <Icon className="size-3" aria-hidden />
      <span className="max-w-[20rem] truncate">{source.value}</span>
    </Badge>
  );
}

function VoteBadge({ validator }: { validator: ResolutionValidator }) {
  const voteLabel = validator.vote?.trim();
  if (!voteLabel) return null;
  const tone =
    validator.agreed === true
      ? "border-accent-foreground/30 text-accent-foreground"
      : validator.agreed === false
      ? "border-destructive/30 text-destructive"
      : "border-border text-muted-foreground";
  return (
    <Badge variant="outline" className={`font-normal ${tone}`}>
      Vote: {voteLabel}
    </Badge>
  );
}

function ValidatorCard({ validator }: { validator: ResolutionValidator }) {
  const reasoning = validator.reasoning?.trim() || "(no reasoning recorded)";
  const proposedOutcome = validator.proposedOutcome?.trim();
  const execution = validator.executionStatus?.trim();
  const showFailedExecution = execution && execution.toUpperCase() !== "SUCCESS";
  return (
    <article className="flex h-full flex-col justify-between rounded-md border border-border bg-background p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {validator.label}
          </p>
          {proposedOutcome ? (
            <Badge variant="outline" className="font-normal text-foreground">
              {proposedOutcome}
            </Badge>
          ) : null}
        </div>
        <p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {reasoning}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <VoteBadge validator={validator} />
        {showFailedExecution ? (
          <Badge variant="outline" className="border-destructive/30 font-normal text-destructive">
            {execution}
          </Badge>
        ) : null}
        {validator.address ? (
          <span className="break-all font-mono text-[0.65rem] text-muted-foreground">
            {validator.address}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function SourcesRow({ sources }: { sources: ResolutionSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sources.map((source) => (
        <SourceChip key={`${source.kind}:${source.value}`} source={source} />
      ))}
    </div>
  );
}

function ValidatorGrid({ validators }: { validators: ResolutionValidator[] }) {
  if (validators.length === 0) return null;
  return (
    <div
      className={`mt-5 grid gap-3 ${
        validators.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {validators.map((validator, idx) => (
        <ValidatorCard key={`${validator.label}-${idx}`} validator={validator} />
      ))}
    </div>
  );
}

function ConsensusReasoning({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return (
    <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {text}
    </p>
  );
}

export function ResolutionSummaryPanel({ summary }: ResolutionSummaryPanelProps) {
  if (summary.status === "active") {
    return (
      <section
        aria-labelledby="resolution-summary-heading"
        className="rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h2
            id="resolution-summary-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Pending resolution
          </h2>
          {summary.title ? (
            <p className="text-base text-muted-foreground">{summary.title}</p>
          ) : null}
        </div>

        <SourcesRow sources={summary.sources} />

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-foreground">
          When the resolution date passes, validators independently read these sources and run the
          resolution prompt. The equivalence principle requires their outputs to agree before the
          outcome is recorded on-chain.
        </p>

        <ConsensusReasoning text={summary.consensusReasoning} />

        {summary.earliestResolutionDate ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Earliest resolution: {summary.earliestResolutionDate}
          </p>
        ) : null}
      </section>
    );
  }

  if (summary.status === "error") {
    const timestampLabel = formatTimestamp(summary.failedAt);
    return (
      <section
        aria-labelledby="resolution-summary-heading"
        className="rounded-lg border border-destructive/30 bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2
              id="resolution-summary-heading"
              className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-destructive"
            >
              <AlertCircle className="size-6 shrink-0" aria-hidden />
              Resolution failed
            </h2>
            {summary.title ? (
              <p className="break-words text-base text-muted-foreground">{summary.title}</p>
            ) : null}
          </div>
          {timestampLabel ? (
            <Badge
              variant="outline"
              className="shrink-0 border-destructive/30 font-normal text-destructive"
              aria-label={`Failed ${timestampLabel}`}
            >
              {timestampLabel}
            </Badge>
          ) : null}
        </div>

        <SourcesRow sources={summary.sources} />

        <ConsensusReasoning text={summary.consensusReasoning} />

        <ValidatorGrid validators={summary.validators} />

        {summary.validators.length === 0 && !summary.consensusReasoning ? (
          <p className="mt-5 text-sm text-muted-foreground">
            The resolution attempt did not produce an outcome in the configured list. A creator can
            initiate another resolution attempt.
          </p>
        ) : null}
      </section>
    );
  }

  const { outcome, title, sources, validators, resolvedAt, consensusReasoning } = summary;
  const timestampLabel = formatTimestamp(resolvedAt);

  return (
    <section
      aria-labelledby="resolution-summary-heading"
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id="resolution-summary-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Outcome: {outcome}
          </h2>
          {title ? (
            <p className="break-words text-base text-muted-foreground">{title}</p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          aria-label={
            timestampLabel
              ? `Equivalence reached ${timestampLabel}`
              : "Equivalence reached"
          }
          className="shrink-0 gap-1.5 border-accent-foreground/30 bg-accent text-accent-foreground"
        >
          <Check className="size-3" aria-hidden />
          Equivalence reached
          {timestampLabel ? (
            <span className="font-normal text-accent-foreground/80"> · {timestampLabel}</span>
          ) : null}
        </Badge>
      </div>

      <SourcesRow sources={sources} />

      <ConsensusReasoning text={consensusReasoning} />

      {validators.length === 0 ? (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Resolved without recorded per-validator outputs (legacy or non-equivalence resolution).
        </p>
      ) : (
        <ValidatorGrid validators={validators} />
      )}
    </section>
  );
}
