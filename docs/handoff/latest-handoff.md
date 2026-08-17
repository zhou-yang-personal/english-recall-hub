# English Recall Hub｜Latest Handoff

Version: `0.3.1-m1-foundation`
Updated: `2026-08-17`
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

## 6. Implemented M1 Foundation

- React 19, TypeScript, Vite, React Router and vite-plugin-pwa application shell.
- P0 routes for Home, sign-in, LearnerProfiles, review and settings.
- Cloudflare static-assets SPA configuration with no custom Worker API.
- Dexie v1 stores for profiles, content, events, materialized state and sync cursors.
- Pure Scheduler v1 and deterministic ReviewEvent ordering/replay.
- Atomic Dexie rating transaction that appends a pending event and updates ReviewState.
- Fixed-clock unit tests and fake-IndexedDB transaction/rollback integration tests.

## 7. Next Development Steps

1. Add local Supabase configuration/migrations and two-user RLS tests.
2. Implement email OTP and LearnerProfile selection.
3. Implement real current-card import, Zod validation and Card generation.
4. Connect Home/Review UI and TTS to IndexedDB.
5. Implement ReviewEvent push/pull/replay and sync cursor transactions.
6. Add offline/update/export/import behavior.
7. Add browser E2E, deploy to Cloudflare and perform device acceptance.

Estimated full MVP: `13–15 working days`.

## 8. Verification Status

```text
Application typecheck/lint/build: passed
Unit/integration: 12 passed across 3 test files
Wrangler deploy --dry-run: passed; 9 static files discovered
E2E: not configured
CI: not configured
Cloudflare/Supabase: not provisioned
Dependencies/package-lock.json: created; npm audit reported 0 vulnerabilities
```

This handoff describes an implemented M1 foundation, not a completed MVP.
