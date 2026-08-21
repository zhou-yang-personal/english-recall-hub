# English Recall Hub｜Latest Handoff

Version: `0.7.1-m5-pwa-refresh`
Updated: `2026-08-21`
Source-of-truth branch: `dev`

## 1. Current Direction

The project is a Web/PWA with local-first review and lightweight paired-family progress synchronization.

```text
React/TypeScript/Vite
Dexie/IndexedDB
Supabase Postgres + RLS
GitHub `card` public content
Cloudflare Worker API + Static Assets
Web Speech API
```

Normal experience:

```text
new device optionally enters one family code → signed device Cookie
→ directly choose a GitHub ContentProfile → automatically prepare progress identity → review offline → save locally
→ synchronize ReviewEvents across paired devices
```

## 2. Important Design Corrections

The `0.2.0` snapshot model did not provide convergent multi-device events. The subsequent email-OTP design added unnecessary user-facing authentication. The current model keeps event synchronization while moving platform credentials and ownership checks into a tiny Worker backend.

The current design replaces it with:

```text
FamilySpace + paired DeviceGrant
→ LearnerProfile
→ append-only ReviewEvents
→ idempotent push + cursor pull
→ deterministic local ReviewState replay
```

`FamilySpace/DeviceGrant`, internal `LearnerProfile` and visible GitHub `ContentProfile` are separate concepts. The frontend discovers `card/profiles/*`, shows each ContentProfile once and prepares progress identity automatically. GitHub `progress` is no longer an MVP runtime database.

## 3. Five-view Development Baseline

`docs/design/web-mvp-framework-design.md` now defines:

- Scenario view: one-time device pairing, daily/offline review, new device, content update and cloud failure.
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
direct GitHub ContentProfile selection without login and automatic LearnerProfile preparation
one-time family pairing and persisted signed device grant
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
D1/KV/R2/general backend framework; advanced cards
cloud TTS/scoring; push; payment/ads/analytics/community
```

## 6. Implemented Foundation

- M1: React 19, TypeScript, Vite, React Router and vite-plugin-pwa application shell.
- M1: Dexie v1 stores, Scheduler v1, deterministic replay and atomic rating transaction.
- M2: Supabase CLI project, versioned `english_recall` migration, explicit grants and RLS.
- M2: Supabase Profile/Event schema and RLS foundation; the former browser auth client has now been retired.
- M2: Local-only LearnerProfile create/select and default Profiles routing.
- M2: Two-user pgTAP RLS acceptance script plus unit/integration tests for runtime config/profile use cases.
- M3: Public GitHub Manifest/Template/Pack fetch with Zod boundary validation and bounded concurrency.
- M3: JSONL parsing including the final non-newline record, invalid-row reporting and honest null-hash warning.
- M3: Stable SHA-256 recognition/production Card generation and transactional IndexedDB content replacement.
- M3: Real Home counts, automatic/manual content sync, prioritized review queue and answer/rating UI.
- M3: Atomic local ReviewEvent/ReviewState rating persistence connected to the live review flow.
- M4: Cloudflare Worker `/api` entry point alongside static assets, without D1/KV/R2 or a backend framework.
- M4: Strong family-code verification and an HMAC-signed one-year HttpOnly/Secure/SameSite device Cookie.
- M4: Worker-only Supabase secret/owner boundary with family Profile list/create and local-profile linking.
- M4: Bounded idempotent ReviewEvent push, cursor-based pull, canonical local replay and reconnect/manual triggers.
- M4: Removed the email/Magic Link UI and browser Supabase configuration; daily flow now directly selects a learner.
- M5: Web Speech auto/manual pronunciation with locale fallback, persisted voice/rate/listening settings and an audio-first listening mode.
- M5: Rating buttons show prospective delays; committed ratings show the exact next-review time.
- M5: Local-first `/progress` insights show unseen/learning/review/mature/due counts, seven-day activity and Note-level recognition/production schedules.
- M5: Each Card shows its stage, due time, interval, review/lapse counts and a clearly labeled minimum all-`known` estimate to reach the 90-day mature threshold.
- M5: Review-first Home actions and a four-item mobile bottom navigation improve one-handed daily use.
- M5: Content projection version 2 adds Note/Card display and pronunciation fields while retaining stable Card identifiers and existing progress.
- M5.1: Settings shows the package version and can reset only Service Worker/Cache Storage resources before a cache-busted reload; IndexedDB progress and the paired-device Cookie are preserved.
- Remote migration `20260818020000` is applied and the schema is exposed through Data API.
- Hosted smoke testing found that column-only LearnerProfile INSERT grants produced Data API HTTP 401; migration `20260818030000` adds the table-level INSERT grant while retaining RLS ownership checks.

## 7. Next Development Steps

1. Perform a real user rating on one paired browser and confirm hosted Event push/pull on a second paired device.
2. Run the two-user RLS script where Docker/pg_prove is available.
3. Add progress export/import behavior; the manual application-resource recovery action is implemented.
4. Add browser E2E and perform iPhone/Android device acceptance, especially iOS Web Speech gesture/fallback behavior.
5. Consider incremental ProgressEvent paging only if real household data volume makes local aggregation observably slow.

Estimated full MVP: `13–15 working days`.

## 8. Verification Status

```text
Application typecheck/lint/build: passed
Unit/integration: 56 passed across 18 test files
Supabase remote migration/list/lint: passed
Anonymous Data API read/write: blocked with HTTP 401 as intended
Two-user pgTAP script: added; execution blocked because this environment cannot access Docker
Wrangler deploy --dry-run: passed; Worker entry plus 17 static files discovered
E2E: not configured
CI: not configured
Supabase: provisioned, linked and migrated; prior hosted LearnerProfile persistence smoke test passed
Cloudflare: preview routes/PWA assets and fixed production domain return HTTP 200
Real card-source smoke test: 27/27 packs, 137 valid Notes, 274 unique Cards, 0 skipped rows
Cloudflare production: version `a73bd97d-572d-4fa7-a143-105c79b3e250` deployed to `english-recall-hub.zhou-yang-personal.workers.dev`
Worker Secrets: all five required names configured as `secret_text`; Supabase/signing values were not printed, and the pairing code was returned once to the operator
Hosted family pairing: wrong code denied; valid code issued a device grant; paired status and unpair passed
Hosted family Profile/Event reads: one existing family Profile loaded; ReviewEvent page returned HTTP 200
Hosted ReviewEvent write: not smoke-tested to avoid inserting a fabricated learner rating
Hosted `0.5.1` hotfix: same-name create returned the existing UUID and kept the Profile count unchanged; one accidental smoke-test row was removed after confirming it had zero events
Hosted `0.6.0` catalog flow: Profiles route/new asset returned HTTP 200, GitHub catalog CORS passed and listed `manman`; no ReviewEvent was written
Hosted `0.7.0` learning-experience flow: Home/Review/Progress/Settings routes, current hashed assets, PWA assets and GitHub profile catalog returned HTTP 200; an unpaired Profile settings PATCH was denied with HTTP 401 as intended
Hosted `0.7.1` PWA refresh flow: current HTML and hashed assets returned HTTP 200, HTML retained `max-age=0, must-revalidate`, and the entry asset contained the release version, refresh marker and action label
```

This handoff describes implemented M1–M5 foundations; offline update UX, export/import and device/browser acceptance remain before the full MVP is complete.
