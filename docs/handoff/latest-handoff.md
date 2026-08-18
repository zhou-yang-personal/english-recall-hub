# English Recall Hub｜Latest Handoff

Version: `0.3.2-m2-account-foundation`
Updated: `2026-08-18`
Source-of-truth branch: `dev`

## 1. Current Direction

The project is a Web/PWA with local-first review and lightweight account progress synchronization.

```text
React/TypeScript/Vite
Dexie/IndexedDB
Supabase email OTP + Postgres + RLS
GitHub `card` public content
Cloudflare Workers Static Assets
Web Speech API
```

Normal experience:

```text
sign in once → choose LearnerProfile → review offline
→ save locally → synchronize ReviewEvents across devices
```

## 2. Important Design Correction

The previous `0.2.0` design used a Profile sync key, Cloudflare Worker and GitHub `progress` snapshots. That model was suitable only for backup/restore and did not satisfy the actual account/multi-device requirement.

The current design replaces it with:

```text
Supabase Account
→ LearnerProfile
→ append-only ReviewEvents
→ idempotent push + cursor pull
→ deterministic local ReviewState replay
```

`Account`, `LearnerProfile` and GitHub `ContentProfile` are separate concepts. GitHub `progress` is no longer an MVP runtime database.

## 3. Five-view Development Baseline

`docs/design/web-mvp-framework-design.md` now defines:

- Scenario view: sign-in, daily/offline review, new device, content update and cloud failure.
- Logical view: modules, domain concepts and dependency direction.
- Process view: startup, rating transaction, progress sync and content sync.
- Development view: feature-first Ports and Adapters structure.
- Deployment view: Cloudflare static PWA + GitHub card + shared Supabase schema.
- Data contracts, RLS intent, scheduler, traceability, milestones and acceptance gates.

## 4. Current Data Reality

Observed on `2026-08-17`:

```text
card profile: manman
schema_version: 0.1.0
note_count: 137
listed packs: 27
pack sha256: null
```

Counts are not hardcoded. Recognition/production are enabled; unsupported templates are ignored. JSONL final records without a trailing newline must parse correctly.

## 5. MVP Scope

Must implement:

```text
email OTP and persisted session
LearnerProfile/ContentProfile separation
public card sync and IndexedDB
recognition/production + scheduler v1
atomic ReviewEvent/ReviewState save
idempotent multi-device event sync/replay
English/Spanish TTS and listening mode
progress export/import
PWA install and Cloudflare deployment
RLS isolation tests
```

Not in MVP:

```text
native apps; normal passwords/social login/public SaaS
family roles/invitations/admin site; real-time collaboration
custom progress API; D1/KV/R2; advanced cards
cloud TTS/scoring; push; payment/ads/analytics/community
```

## 6. Implemented Foundation

- M1: React 19, TypeScript, Vite, React Router and vite-plugin-pwa application shell.
- M1: Dexie v1 stores, Scheduler v1, deterministic replay and atomic rating transaction.
- M2: Supabase CLI project, versioned `english_recall` migration, explicit grants and RLS.
- M2: Browser-safe runtime config and Supabase client with persisted auth session.
- M2: Email passwordless request/verification, sign-out and auth-aware navigation.
- M2: Remote LearnerProfile list/create plus transactional local Dexie cache replacement.
- M2: Two-user pgTAP RLS acceptance script and unit tests for runtime config/profile use cases.
- Remote migration `20260818020000` is applied and the schema is exposed through Data API.
- Hosted smoke testing found that column-only LearnerProfile INSERT grants produced Data API HTTP 401; migration `20260818030000` adds the table-level INSERT grant while retaining RLS ownership checks.

## 7. Next Development Steps

1. Activate the fixed production domain by deploying the configured production branch, then recheck Auth redirect behavior.
2. Decide later whether numeric codes justify custom SMTP; default hosted Magic Link is sufficient for passwordless MVP access.
3. Run the two-user RLS script where Docker/pg_prove is available.
4. Implement real current-card import, Zod validation and Card generation.
5. Connect Home/Review UI and TTS to IndexedDB.
6. Implement ReviewEvent push/pull/replay and sync cursor transactions.
7. Add offline/update/export/import behavior.
8. Add browser E2E and perform device acceptance.

Estimated full MVP: `13–15 working days`.

## 8. Verification Status

```text
Application typecheck/lint/build: passed
Unit/integration: 18 passed across 5 test files
Supabase remote migration/list/lint: passed
Anonymous Data API read/write: blocked with HTTP 401 as intended
Two-user pgTAP script: added; execution blocked because this environment cannot access Docker
Wrangler deploy --dry-run: passed; 13 static files discovered
E2E: not configured
CI: not configured
Supabase: provisioned, linked and migrated; hosted Magic Link and LearnerProfile cloud/local persistence smoke test passed
Cloudflare: preview routes/PWA assets return HTTP 200; fixed production domain awaits production-branch deployment
Dependencies unchanged; npm audit reported 0 vulnerabilities
```

This handoff describes an implemented M2 account foundation, not a completed MVP.
