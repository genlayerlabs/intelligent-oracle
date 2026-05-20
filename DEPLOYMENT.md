# Deployment

This document describes the production deployment model for `genlayerlabs/intelligent-oracle` and the migration playbook from the legacy four-Vercel-project layout to the consolidated single-Next.js-app layout introduced by this branch.

## Deployment model

- **Source of truth:** `genlayerlabs/intelligent-oracle` (this repo, `main` branch).
- **Production hosting:** a single Vercel project pointed at this repo. Auto-deploys on push to `main`; preview deploys on every PR.
- **Marketing site:** `www.intelligentoracle.com` is a separate Webflow property. It is not part of this repo or its Vercel deployments — it only links into the app.
- **Foundation fork:** `genlayer-foundation/intelligent-oracle` is a development fork. Foundation work lands here via PRs to upstream `main`; the fork itself has no production Vercel project.

## Vercel project (single, consolidated)

| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected; pinned in `vercel.json`) |
| Root directory | `.` |
| Build command | `next build` (Vercel default) |
| Install command | `npm install` (Vercel default) |
| Output directory | `.next` (Vercel default) |
| Node version | 20.x (matches `package.json` engines) |
| Ignored paths | `intelligent-contracts/`, `test/`, `scripts/`, `.claude/`, `.conductor/`, `tasks/` (see `.vercelignore`) |

### Required environment variables

| Name | Scope | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | Server-only | OpenRouter key used by `src/app/api/chat/route.ts`. **Never expose to the client.** |
| `OPENROUTER_MODEL` | Server-only | Defaults to `openai/gpt-5-mini`. Override per environment. |
| `OPENROUTER_BASE_URL` | Server-only | Defaults to OpenRouter's hosted endpoint. |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | Browser | `https://studio.genlayer.com/api` for hosted Studio (production default). |
| `NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS` | Browser | Address output by `scripts/` factory deploy. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Browser | Required at build and runtime for wallet auth. |
| `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Browser | Optional; only if Privy requires it for the configured app. |
| `NEXT_PUBLIC_IC_REGISTRY_ADDRESS` | Browser | Legacy fallback. Set only during factory migration; remove when no longer referenced. |

## Domain mapping

The consolidated app handles every URL previously served by four separate projects. Map domains accordingly:

| Domain | Routes to | Notes |
|---|---|---|
| `app.intelligentoracle.com` (or whichever primary domain you pick) | `/` (landing), `/assistant`, `/explorer`, `/oracle/[address]`, `/docs`, `/api/chat` | Primary production domain for the app. |
| `explorer.intelligentoracle.com` | `/` rewrites to `/explorer`; `/oracle/[address]` works as-is | Host-based rewrite is in `next.config.ts`. Detail routes match the legacy path 1:1. |

The marketing site at `www.intelligentoracle.com` is unchanged. Update its "Try the wizard" CTA to point at the new wizard URL (e.g., `https://app.intelligentoracle.com/assistant`).

## Path compatibility with the legacy layout

| Legacy URL | New URL | Handled by |
|---|---|---|
| `intelligent-oracle-wizard.vercel.app/` | `app.intelligentoracle.com/assistant` | Manual link update (Webflow CTA); plus `/wizard*` → `/assistant*` redirect in `next.config.ts` for any old bookmarks pointing at `/wizard` on the new domain. |
| `intelligent-oracle-explorer.vercel.app/` | `app.intelligentoracle.com/explorer` (or `explorer.intelligentoracle.com/`) | Host-based rewrite in `next.config.ts` covers the subdomain case. |
| `intelligent-oracle-explorer.vercel.app/oracle/:address` | `app.intelligentoracle.com/oracle/[address]` or `explorer.intelligentoracle.com/oracle/[address]` | Path is identical — no rewrite needed. |
| `intelligent-oracle-bridge.vercel.app/api/chat` | `app.intelligentoracle.com/api/chat` | Path is identical. Update any external integration pointing at the legacy host. |

The legacy `bridge/api/bridge/deploy-intelligent-oracle` endpoint is removed. Factory deployment is now a one-shot CLI under `scripts/` (`cd scripts && npm run deploy`) executed with a wallet, not a server route.

## Migration playbook (legacy four-project → consolidated single project)

Execute in order. Each phase is independently reversible until you reach Phase 5.

### Phase 1 — Stop the bleeding (before merging the modernization PR)

In the Vercel dashboard (`YeagerAI` team), for each of these four projects:

- `intelligent-oracle`
- `intelligent-oracle-bridge`
- `intelligent-oracle-wizard`
- `intelligent-oracle-explorer`

Go to **Settings → Git → Disconnect from Git**. This stops auto-deploys without affecting the last successful production deployment, which keeps serving its cached output. CI on this repo immediately goes silent — no more red checks on PRs.

### Phase 2 — Create the new consolidated project

In the Vercel dashboard, create a new project:

- **Name:** `intelligent-oracle-app` (or reuse the existing `intelligent-oracle` after deleting its old config — fresh is cleaner).
- **Git repository:** `genlayerlabs/intelligent-oracle`, branch `main`.
- **Framework preset:** Next.js (auto-detected).
- **Root directory:** `.`
- **Environment variables:** all of the variables listed in "Required environment variables" above, scoped to Production and Preview.

Do not connect any domains yet. Trigger one deploy from `main` and verify it builds clean and the resulting Vercel preview URL serves `/`, `/assistant`, `/explorer`, `/oracle/<any-address>`, `/docs`, and `/api/chat`.

### Phase 3 — Migrate custom domains

Once the new project is verified:

1. In the new project: **Settings → Domains → Add** for each production domain (`app.intelligentoracle.com`, `explorer.intelligentoracle.com`, any others).
2. Update DNS at the registrar so each domain's `CNAME`/`ALIAS` points at Vercel's DNS target for the new project.
3. In the legacy projects: **Settings → Domains** → remove the same domain entries. Vercel rejects two projects claiming the same domain, so the order is "add on new, then remove from old" only if you can tolerate a brief mismatch — otherwise remove from the old project first and accept a few seconds of downtime per domain.
4. Update the Webflow marketing site's wizard CTA to the new wizard URL.

### Phase 4 — Merge PR #11

Merge the modernization PR into `main`. The new consolidated project deploys; the four legacy projects remain disconnected and silent, serving their last-cached output on any remaining `.vercel.app` URLs only.

### Phase 5 — Delete legacy projects

After at least 48 hours of confirmed traffic on the new project (long enough for any cached CDN edges, search indexes, and DNS propagation to settle), delete the four legacy Vercel projects. The `.vercel.app` URLs go away; bookmarked custom domains continue to work because they've already been migrated.

## Rollback

- **Build fails on the new project:** the new project's previous successful deploy keeps serving. Investigate via the failing deployment's build log.
- **A live URL regresses:** in the new project, **Deployments → previous green deploy → Promote to Production**. Revert any blocking commit in this repo separately.
- **Full rollback during Phase 1-3 (pre-merge):** reconnect Git on the four legacy projects; nothing else has changed.
- **Full rollback after merge:** revert the merge commit on `main`. The legacy projects are disconnected, so they won't redeploy — they keep serving their last-cached output as before. The new project will redeploy from the reverted state.

## Operational notes

- The Python contracts in `intelligent-contracts/` and the standalone factory deploy in `scripts/` are excluded from the Vercel build via `.vercelignore`. Neither needs the Vercel runtime.
- The `tools/sync-sources-catalog.ts` script is dev-only and is not invoked by `next build`. Run it manually with `npm run sync-sources` when the gym sources catalog changes; commit the resulting prompt update.
- `npm run check` (lint + typecheck + vitest + Next build) gates this repo locally. The same suite runs in any Vercel preview build because `next build` is invoked there.
