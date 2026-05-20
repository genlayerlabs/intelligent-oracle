"use client";

import { AlertCircle, ArrowDownAZ, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddressText } from "@/components/address";
import { AppHeader } from "@/components/app-header";
import { BrandMark } from "@/components/brand/brand-mark";
import { WaveDecoration } from "@/components/brand/wave-decoration";
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="brand-icon-frame">
                  <BrandMark className="size-4" />
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                  <span>Markets</span>
                  <span>/</span>
                  <span>{ready ? "Connected" : "Configuration required"}</span>
                </div>
              </div>
              <h1 className="mt-5 text-[clamp(2.25rem,6vw,5.25rem)] font-light leading-none tracking-normal text-black dark:text-white">
                Market Explorer
              </h1>
              <p className="mt-4 max-w-2xl text-base font-light leading-7 text-black/65 dark:text-white/65">
                Monitor registered markets, resolution status, and validator transaction details.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-black/15 bg-transparent text-black hover:bg-black hover:text-white dark:border-white/20 dark:text-white dark:hover:bg-white dark:hover:text-black">
                <Link href="/assistant">
                  <Plus className="size-4" aria-hidden />
                  Create oracle
                </Link>
              </Button>
              <Button type="button" disabled={!ready || loading} onClick={() => void refreshOracles()} className="bg-black text-white hover:bg-[color:var(--brand-lavender)] dark:bg-white dark:text-black dark:hover:bg-[color:var(--brand-lavender)] dark:hover:text-white">
                {loading ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                {loading ? "Refreshing" : "Refresh"}
              </Button>
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Total" value={counts.all} />
          <Metric label="Active" value={counts.active} />
          <Metric label="Resolved" value={counts.resolved} />
        </section>

        <section className="brand-surface mt-4 overflow-hidden rounded-md">
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/40 dark:text-white/45" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search by title, outcome, status, or address"
                className="border-black/15 bg-white/70 pl-9 dark:border-white/15 dark:bg-white/5"
              />
            </div>
            <FilterGroup value={statusFilter} onChange={setStatusFilter} />
            <label className="flex items-center gap-2 text-sm text-black/55 dark:text-white/55">
              <span className="brand-icon-frame size-8">
                <ArrowDownAZ className="size-4" aria-hidden />
              </span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.currentTarget.value as SortMode)}
                className="h-9 rounded-md border border-black/15 bg-white/70 px-3 text-black outline-none focus:ring-2 focus:ring-[color:var(--brand-lavender)]/30 dark:border-white/15 dark:bg-white/5 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="title">Title</option>
                <option value="resolution">Resolution date</option>
              </select>
            </label>
          </div>

          <Separator className="bg-black/10 dark:bg-white/10" />

          {lastError ? (
            <div className="m-4 flex items-start gap-3 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <span className="brand-icon-frame size-8 border-destructive/25 text-destructive">
                <AlertCircle className="size-4" aria-hidden />
              </span>
              <p>{lastError}</p>
            </div>
          ) : null}

          {!loading && filteredOracles.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <span className="brand-icon-frame size-12">
                <Search className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-sm font-medium text-black dark:text-white">No oracles found</h2>
              <p className="mt-1 max-w-md text-sm text-black/55 dark:text-white/55">
                Create one from the assistant or configure the factory.
              </p>
            </div>
          ) : null}

          {loading && filteredOracles.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-black/55 dark:text-white/55">
              <Spinner />
              Loading markets
            </div>
          ) : null}

          {filteredOracles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="hidden min-w-full border-separate border-spacing-0 text-sm md:table">
                <thead className="bg-white/45 text-left text-xs uppercase tracking-[0.14em] text-black/45 dark:bg-white/[0.03] dark:text-white/45">
                  <tr>
                    <th className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">Market</th>
                    <th className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">Status</th>
                    <th className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">Outcome</th>
                    <th className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">Earliest resolution</th>
                    <th className="border-b border-black/10 px-4 py-3 font-medium dark:border-white/10">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOracles.map((oracle) => (
                    <tr key={oracle.address} className="group">
                      <td className="border-b border-black/10 px-4 py-4 dark:border-white/10">
                        <Link href={`/oracle/${oracle.address}`} className="block">
                          <p className="font-medium text-black group-hover:text-[color:var(--brand-lavender)] dark:text-white">
                            {oracle.title || "Untitled oracle"}
                          </p>
                          <p className="mt-1 line-clamp-1 max-w-xl text-black/55 dark:text-white/55">
                            {oracle.description || "No description"}
                          </p>
                        </Link>
                      </td>
                      <td className="border-b border-black/10 px-4 py-4 dark:border-white/10">
                        <StatusBadge status={oracle.status} />
                      </td>
                      <td className="border-b border-black/10 px-4 py-4 text-black/55 dark:border-white/10 dark:text-white/55">
                        {oracle.outcome || "Pending"}
                      </td>
                      <td className="border-b border-black/10 px-4 py-4 text-black/55 dark:border-white/10 dark:text-white/55">
                        {formatDate(oracle.earliest_resolution_date)}
                      </td>
                      <td className="border-b border-black/10 px-4 py-4 font-mono text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                        <AddressText address={oracle.address} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="divide-y divide-black/10 dark:divide-white/10 md:hidden">
                {filteredOracles.map((oracle) => (
                  <Link key={oracle.address} href={`/oracle/${oracle.address}`} className="block p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-medium text-black dark:text-white">{oracle.title || "Untitled oracle"}</h2>
                        <p className="mt-1 line-clamp-2 text-sm text-black/55 dark:text-white/55">
                          {oracle.description || "No description"}
                        </p>
                      </div>
                      <StatusBadge status={oracle.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 dark:text-white/50">
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
    <div className="brand-surface-solid rounded-md p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-light leading-none text-black dark:text-white">{value}</p>
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
    <div className="flex rounded-md border border-black/10 bg-white/70 p-1 dark:border-white/10 dark:bg-white/5">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`h-7 rounded px-3 text-sm transition ${
            value === filter.value
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
