# CHANGELOG-dev｜English Recall Hub

## 0.5.0-m4-family-sync｜2026-08-18

### Changed

- Replaced the user-facing Supabase email/Magic Link flow with one-time family-device pairing.
- Changed the normal cloud experience to `pair new device once → directly select learner thereafter`.
- Moved all Supabase progress access behind a same-origin Cloudflare Worker API.
- Replaced the local `userId` account marker with `cloudSyncId: family`, including a Dexie v2-to-v3 migration.
- Removed browser Supabase URL/key configuration and the unused `@supabase/supabase-js` dependency.

### Added

- Added HMAC-signed, one-year HttpOnly/Secure/SameSite device grants scoped to `/api`.
- Added Worker endpoints for pairing status/pair/unpair, family Profile list/create, and ReviewEvent push/pull.
- Added server-side family-owner checks before every Profile/Event operation; no D1/KV/R2 or backend framework is used.
- Added local-only LearnerProfile linking that preserves the learner UUID and existing local progress.
- Added bounded idempotent event upload, incremental `sync_seq` download, canonical replay and transactional cursor updates.
- Added progress synchronization on Home, after review ratings, on reconnect and by manual action.
- Added device-pairing, event-sync failure safety and legacy cloud-marker migration tests.

### Security and operations

- Supabase secret key, family owner UUID, pairing code and session signing secret are Worker-only configuration.
- The pairing code is never stored by the frontend; a signed HttpOnly Cookie is the persisted device grant.
- Anonymous browsers still cannot access Supabase tables directly; existing RLS remains defense-in-depth.
- Hosted deployment requires configuring `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FAMILY_OWNER_USER_ID`, `FAMILY_PAIRING_CODE` and `DEVICE_SESSION_SECRET` as Worker Secrets.

### Verification

```text
npm run typecheck: passed
npm run lint: passed
npm test: 39 passed in 12 files
npm run build: passed; PWA generated
npx wrangler deploy --dry-run: passed; Worker entry plus 16 static files discovered
Dependencies: removed @supabase/supabase-js; package-lock updated
Hosted family pairing/Profile/Event smoke test: not yet run
```

## 0.4.0-m3-content-review｜2026-08-18

### Added

- Added a public GitHub CardSource adapter using the configured `card` branch base URL and native `fetch`.
- Added Zod validation for Manifest, Templates and formal Notes, including safe repository paths.
- Added bounded-concurrency Template/Pack retrieval and JSONL parsing that accepts a final record without a newline.
- Added stable SHA-256 recognition/production Card generation from real templates.
- Added Dexie v2 `contentSyncStates` and atomic Note/Card/content-version replacement.
- Added automatic/manual Home content sync with real due, learning, new-card and total-card counts.
- Added the prioritized local review queue, reveal interaction and unknown/fuzzy/known rating UI.
- Made a direct Review-route visit synchronize content automatically when the local queue is empty.
- Connected live ratings to the existing atomic pending ReviewEvent + ReviewState transaction.
- Added unit/integration coverage for generation, import, unchanged/failure safety, content transactions, queue priority and v1-to-v2 database upgrade.

### Data safety and compatibility

- A failed required fetch, invalid Manifest or zero-valid-Note import leaves the previous local dataset unchanged.
- Removed/unsupported Cards do not delete historical ReviewEvents or ReviewStates.
- Null Pack hashes are reported honestly; `manifest.updated_at` remains the current change detector.
- Invalid Note rows are skipped and reported while valid rows continue importing.
- Existing v1 IndexedDB LearnerProfiles survive the v2 schema upgrade.
- No Supabase schema, migration or RLS policy changed.

### Verification

```text
npm run typecheck: passed
npm run lint: passed
npm test: 31 passed in 10 files
npm run build: passed; route chunks and PWA service worker generated
npx wrangler deploy --dry-run: passed; 16 static files discovered
Real card-source smoke: 27/27 packs, 137 valid Notes, 274 unique Cards, 0 skipped rows
Dependencies: unchanged; lock file changed only for project version synchronization
```

## 0.3.3-m2-local-first-profiles｜2026-08-18

### Changed

- Made LearnerProfile selection and creation available without authentication or network access.
- Redirected the first local Home visit to the learner selector when no learner is selected.
- Kept previously cached cloud LearnerProfiles locally usable while cloud sync is disconnected.
- Changed email authentication from the default entry gate to the optional “开启云同步” flow.
- Preserved the selected local learner when stopping cloud sync.
- Added a 60-second login-email resend cooldown to reduce accidental Supabase rate-limit exhaustion.
- Centralized default learner settings for both local and cloud Profile creation.
- Updated the 4+1 design, requirements, project source and handoff to make local-first access authoritative.

### Added

- Added local-only LearnerProfile creation with no fabricated Account identifier.
- Added an IndexedDB integration test proving local-only learners persist and remain independent of cloud-user queries.
- Added local/cloud status labels and an explicit optional cloud checkbox when creating a learner while connected.

### Verification

```text
npm run typecheck: passed
npm run lint: passed
npm test: 21 passed in 6 files
npm run build: passed; PWA service worker generated
npx wrangler deploy --dry-run: passed; 13 static files discovered
Local production preview: /, /profiles, /sign-in, /settings, manifest and service worker returned HTTP 200
Database migration: not changed
Dependencies: unchanged; lock file changed only for project version synchronization
E2E/browser interaction: not configured; no browser executable was available in this environment
```

## 0.3.2-m2-account-foundation｜2026-08-18

### Added

- Initialized the Supabase CLI project and added the versioned `english_recall` database migration.
- Added LearnerProfile and append-only ReviewEvent tables with explicit grants, constraints, indexes and RLS.
- Added a two-user pgTAP acceptance script for cross-account isolation and append-only event permissions.
- Added browser-safe runtime configuration validation and a persisted Supabase client.
- Added email passwordless request/verification, session observation and sign-out.
- Added remote LearnerProfile list/create use cases and transactional Dexie cache replacement.
- Added functional sign-in and LearnerProfile selection/creation UI.
- Added runtime configuration and profile use-case unit tests.
- Documented the REST fallback when `gh pr edit` is blocked by the Projects (classic) GraphQL deprecation.
- Added a follow-up migration granting table-level LearnerProfile INSERT access required by the Data API; RLS continues to enforce account ownership.

### Hosted configuration

- Linked the Supabase project and applied migration `20260818020000`.
- Exposed `english_recall` through Data API.
- Confirmed anonymous GET and POST are both denied with HTTP 401.
- Configured the Cloudflare production/preview domains and corresponding Supabase Auth redirects without overwriting unrelated Auth settings.
- Verified preview root, SPA routes, web manifest and service worker return HTTP 200.
- Recorded that hosted numeric-template modification is unavailable on the free tier with Supabase default email delivery; hosted passwordless login currently uses its default one-time Magic Link.
- Diagnosed hosted LearnerProfile creation through API logs: authenticated reads returned HTTP 200 while column-only INSERT grants caused POST requests to return HTTP 401.
- Verified the repaired hosted flow: LearnerProfile POST returned HTTP 201, one remote row exists and the UI confirmed local persistence.
- Left Supabase secret/service-role keys, database passwords and access tokens outside Git/frontend configuration.

### Verification

```text
npm run typecheck: passed
npm run lint: passed
npm test: 18 passed in 5 files
npm run build: passed; PWA service worker generated
npx wrangler deploy --dry-run: passed; 13 static files discovered
npm audit: 0 vulnerabilities
supabase migration list: local/remote migration aligned
supabase db lint --linked --schema english_recall: no schema errors
supabase test db --linked: not run; Docker socket unavailable to pg_prove
Hosted passwordless-email/Profile smoke test: passed; remote POST HTTP 201 and local persistence confirmed
Cloudflare deployment: preview verified; fixed production domain awaits production-branch deployment
Dependencies: unchanged; lock file changed only for project version synchronization
```

## 0.3.1-m1-foundation｜2026-08-17

### Added

- Initialized the React 19, TypeScript, Vite 8 and React Router Web/PWA application.
- Added the five P0 routes and a responsive, dependency-light application shell.
- Added vite-plugin-pwa shell caching and Cloudflare Workers Static Assets SPA configuration.
- Added Dexie v1 stores for LearnerProfile, Note, Card, ReviewEvent, ReviewState and SyncState.
- Implemented Scheduler v1, monotonic effective timestamps and deterministic ReviewEvent replay.
- Implemented the atomic rating transaction for pending ReviewEvent plus materialized ReviewState.
- Added fixed-clock scheduler/replay unit tests and fake-IndexedDB transaction integration tests.
- Added `.env.example`, npm scripts and the committed dependency lock file.

### Verification

```text
npm run typecheck: passed
npm run lint: passed
npm test: 12 passed in 3 files
npm run build: passed; PWA service worker generated
npx wrangler deploy --dry-run: passed; no cloud account used
npm audit: 0 vulnerabilities
E2E/CI: not configured
Cloudflare/Supabase: not provisioned
```

## 0.3.0-account-sync-design｜2026-08-17

### Changed

- Replaced Profile sync-key + Cloudflare Worker + GitHub progress snapshots with Supabase email OTP, Postgres/RLS and incremental ReviewEvent synchronization.
- Separated Account, LearnerProfile and GitHub ContentProfile responsibilities.
- Made ReviewEvent the synchronized fact and ReviewState a deterministic local materialized view.
- Defined idempotent event push, `sync_seq` cursor pull and cross-device replay convergence.
- Reduced Cloudflare to static PWA deployment; removed the custom progress API from MVP.
- Reorganized the implementation baseline using scenario, logical, process, development and deployment views.
- Selected feature-first lightweight Ports and Adapters with explicit dependency rules and no DI container/global state framework.
- Updated current card reality from 130 to 137 observed Notes while forbidding hardcoded counts.
- Added the JSONL no-trailing-newline compatibility requirement.
- Replaced backup/restore acceptance cases with account, RLS, offline queue, idempotency and new-device convergence cases.
- Kept future family roles, Realtime, remote checkpoints and privileged backend code behind observed upgrade triggers.

### Verification

```text
Documentation/design consistency checks: completed
Application build/test/E2E: not run; application project not initialized
Cloudflare/Supabase: not provisioned
Dependencies/lock files: not changed
```

## 0.2.0-web-mvp-design｜2026-08-12

### Changed

- Switched the approved first-version platform from React Native/Expo mobile to Web/PWA.
- Set the implementation stack to React, TypeScript, Vite, Dexie/IndexedDB, Web Speech API and Cloudflare Workers Static Assets/Worker API.
- Removed normal account/password, GitHub OAuth and browser PAT input from MVP.
- Defined normal user flow as `open app → choose Profile → review`.
- Defined one-time Profile setup link for new-device cloud backup enrollment.
- Replaced SQLite runtime design with IndexedDB local-first runtime.
- Limited MVP card types to recognition and production because current Notes do not provide `cloze_sentence`.
- Defined current card compatibility around 130 Notes, 27 listed packs and null pack hashes.
- Simplified card sync to compare `manifest.updated_at` and upsert listed packs when changed.
- Removed persistent audio-file cache from Web MVP; retained browser system TTS and language/voice preferences.
- Defined bounded progress snapshots through a Worker with GitHub credentials stored only in Cloudflare Secrets.
- Updated external Project settings and the single Project Source file to remove the obsolete mobile/SQLite baseline.
- Updated the GitHub connector guide so Web/PWA reads `card` publicly and Worker-only code writes `progress`.

### Added

- `docs/design/web-mvp-framework-design.md` as the implementation-level baseline.
- `docs/development/English-Recall-Hub-Project-Source.txt` as the single external Project Source.
- Executable Dexie schema, module layout, Worker API and security boundaries.
- Simple SRS rules and queue priority.
- 22 acceptance use cases.
- Testing and device-acceptance strategy.
- Development estimate: 12–13 working days for full MVP; 8–9 working days for local-only MVP.
- Code estimate: 4,200–6,500 production LOC and 1,200–2,000 test LOC.

### Updated Files

```text
README.md
AGENTS.project.md
docs/design/current-core-design.md
docs/design/web-mvp-framework-design.md
docs/requirements/current-requirements.md
docs/handoff/latest-handoff.md
docs/development/chatgpt-github-connector-guide.md
docs/development/project-entry-settings.md
docs/development/English-Recall-Hub-Project-Source.txt
docs/changes/CHANGELOG-dev.md
```

### Verification

```text
Documentation consistency review: completed
Application build: not run; application project not initialized
Unit/E2E tests: not run; no application code yet
CI: not configured
Dependencies/lock files: not changed
```

## 0.1.0-docs-baseline｜2026-07-07

- 初始化 `dev` 文档基线。
- 建立 `AGENTS.md` / `AGENTS.common.md` / `AGENTS.project.md` 三文件治理结构。
- 写入核心设计与当前需求文档。
- 明确初始主链路：ChatGPT Project → draft → Builder → card → local review → progress backup。
- 尚未创建应用代码、Builder、客户端数据库 Schema 或 CI。
