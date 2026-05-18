"use client";

import { AlertCircle, ArrowDownAZ, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddressText } from "@/components/address";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import type { Oracle } from "@/lib/types";
import { useGenLayer } from "@/lib/use-genlayer";

type StatusFilter = "all" | "active" | "resolved" | "error";
type SortMode = "newest" | "title" | "resolution";

function formatDate(dateString?: string) {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeStatus(status?: string) {
  const normalized = (status || "unknown").toLowerCase();
  if (normalized.includes("resolved")) return "resolved";
  if (normalized.includes("error") || normalized.includes("fail")) return "error";
  return "active";
}

function matchesOracle(oracle: Oracle, query: string) {
  if (!query) return true;
  const haystack = [
    oracle.title,
    oracle.description,
    oracle.address,
    oracle.status,
    oracle.outcome,
    ...(oracle.potential_outcomes || []),
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function ExplorerPage() {
  const { ready, oracles, loading, lastError, refreshOracles } = useGenLayer();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    if (!ready) return;
    void refreshOracles();
  }, [ready, refreshOracles]);

  const filteredOracles = useMemo(() => {
    const next = oracles
      .filter((oracle) => matchesOracle(oracle, query))
      .filter((oracle) => statusFilter === "all" || normalizeStatus(oracle.status) === statusFilter);

    next.sort((a, b) => {
      if (sortMode === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortMode === "resolution") {
        return (a.earliest_resolution_date || "").localeCompare(b.earliest_resolution_date || "");
      }
      return oracles.indexOf(b) - oracles.indexOf(a);
    });

    return next;
  }, [oracles, query, sortMode, statusFilter]);

  const counts = useMemo(() => ({
    all: oracles.length,
    active: oracles.filter((oracle) => normalizeStatus(oracle.status) === "active").length,
    resolved: oracles.filter((oracle) => normalizeStatus(oracle.status) === "resolved").length,
    error: oracles.filter((oracle) => normalizeStatus(oracle.status) === "error").length,
  }), [oracles]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader active="explorer" />

      <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Markets</span>
              <span>/</span>
              <span>{ready ? "Connected" : "Configuration required"}</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
              Market Explorer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor registered markets, resolution status, and validator transaction details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/">
                <Plus className="size-4" aria-hidden />
                Create oracle
              </Link>
            </Button>
            <Button type="button" disabled={!ready || loading} onClick={() => void refreshOracles()}>
              {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total" value={counts.all} />
          <Metric label="Active" value={counts.active} />
          <Metric label="Resolved" value={counts.resolved} />
          <Metric label="Needs attention" value={counts.error} />
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card shadow-sm">
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search by title, outcome, status, or address"
                className="pl-9"
              />
            </div>
            <FilterGroup value={statusFilter} onChange={setStatusFilter} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDownAZ className="size-4" aria-hidden />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.currentTarget.value as SortMode)}
                className="h-9 rounded-md border border-input bg-background px-3 text-foreground outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="newest">Newest</option>
                <option value="title">Title</option>
                <option value="resolution">Resolution date</option>
              </select>
            </label>
          </div>

          <Separator />

          {lastError ? (
            <div className="m-4 flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{lastError}</p>
            </div>
          ) : null}

          {!loading && filteredOracles.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <Search className="size-10 text-muted-foreground" aria-hidden />
              <h2 className="mt-4 text-sm font-medium">No oracles found</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Create one from the assistant or configure the factory.
              </p>
            </div>
          ) : null}

          {loading && filteredOracles.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Loading markets
            </div>
          ) : null}

          {filteredOracles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="hidden min-w-full border-separate border-spacing-0 text-sm md:table">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="border-b border-border px-4 py-3 font-medium">Market</th>
                    <th className="border-b border-border px-4 py-3 font-medium">Status</th>
                    <th className="border-b border-border px-4 py-3 font-medium">Outcome</th>
                    <th className="border-b border-border px-4 py-3 font-medium">Earliest resolution</th>
                    <th className="border-b border-border px-4 py-3 font-medium">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOracles.map((oracle) => (
                    <tr key={oracle.address} className="group">
                      <td className="border-b border-border px-4 py-4">
                        <Link href={`/oracle/${oracle.address}`} className="block">
                          <p className="font-medium text-foreground group-hover:text-primary">
                            {oracle.title || "Untitled oracle"}
                          </p>
                          <p className="mt-1 line-clamp-1 max-w-xl text-muted-foreground">
                            {oracle.description || "No description"}
                          </p>
                        </Link>
                      </td>
                      <td className="border-b border-border px-4 py-4">
                        <StatusBadge status={oracle.status} />
                      </td>
                      <td className="border-b border-border px-4 py-4 text-muted-foreground">
                        {oracle.outcome || "Pending"}
                      </td>
                      <td className="border-b border-border px-4 py-4 text-muted-foreground">
                        {formatDate(oracle.earliest_resolution_date)}
                      </td>
                      <td className="border-b border-border px-4 py-4 font-mono text-xs text-muted-foreground">
                        <AddressText address={oracle.address} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="divide-y divide-border md:hidden">
                {filteredOracles.map((oracle) => (
                  <Link key={oracle.address} href={`/oracle/${oracle.address}`} className="block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-medium">{oracle.title || "Untitled oracle"}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {oracle.description || "No description"}
                        </p>
                      </div>
                      <StatusBadge status={oracle.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatDate(oracle.earliest_resolution_date)}</span>
                      <span className="font-mono"><AddressText address={oracle.address} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FilterGroup({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Resolved", value: "resolved" },
    { label: "Errors", value: "error" },
  ];

  return (
    <div className="flex rounded-md border border-input bg-background p-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`h-7 rounded px-3 text-sm transition ${
            value === filter.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
