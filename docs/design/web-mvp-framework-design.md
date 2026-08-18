# English Recall Hub Web MVP Framework Design

Version: `0.5.0-m4-family-sync`
Updated: `2026-08-18`
Status: Development baseline
Repository: `zhou-yang-personal/english-recall-hub`

## 1. Purpose and Boundaries

This is the implementation baseline for the first usable Web/PWA. It uses the 4+1 view model so scenarios, runtime behavior, code structure and deployment remain traceable.

Real first-version need:

```text
personal/family use
→ choose/create a learner Profile without login
→ sync formal cards from GitHub
→ review and listen offline
→ optionally pair a new device once for cross-device progress
```

Selected stack:

```text
React + TypeScript + Vite + React Router
Dexie / IndexedDB + Zod
Web Speech API + vite-plugin-pwa
Supabase Postgres + Row Level Security
Cloudflare Worker API + Static Assets
GitHub card branch
```

Key decisions:

| Decision | Why |
|---|---|
| IndexedDB is the runtime source | Review must be immediate and offline |
| GitHub `card` is the content source | Existing Builder/Note pipeline remains valid |
| Supabase optionally stores cloud progress | Cross-device sync needs queryable user-isolated cloud state |
| Review events are synchronized | Idempotent events converge more safely than whole-snapshot replacement |
| Browser accesses only same-origin `/api` | Platform credentials and ownership checks stay server-side |
| Cloudflare Worker is the tiny backend | It pairs devices and proxies Profile/ReviewEvent operations without D1/KV |
| Pairing happens once per new device | Daily use remains direct with no email/login screen |

Explicit non-goals:

```text
native apps; normal passwords; social login; public SaaS
family invitations/roles/admin console; real-time collaboration
manual conflict UI; general API framework; D1/KV/R2
cloud TTS/audio/IPA/scoring; advanced card types
push/exact background jobs; payment/ads/analytics/community
```

Supabase Realtime and Edge Functions are not required unless a later concrete requirement needs them.

## 2. Current Reality

M1 implements the application shell, local database, scheduler/replay and atomic rating transaction. M2 adds local-first LearnerProfile selection/creation plus Supabase migration/RLS. M3 imports real public content and connects Home/Review. M4 replaces the mistaken email-account UI with one-time family-device pairing, a minimal Worker API, family Profile loading/linking and incremental ReviewEvent synchronization/replay. TTS/listening, browser E2E and CI remain subsequent work.

Observed `card/profiles/manman/manifest.json` on `2026-08-17`:

```text
schema_version: 0.1.0
note_count: 137
listed packs: 27
pack sha256: null
```

The count is a snapshot, never a client constant. The client follows the manifest. Recognition and production are supported; cloze/output/contrast are ignored because current Notes lack fields such as `cloze_sentence`. JSONL parsing must process a final record even when the file has no trailing newline.

## 3. Scenario View (+1)

### S1. First local use

```text
open PWA → choose/create local LearnerProfile without login
→ persist in IndexedDB → sync public cards → Home
```

No email, GitHub token, Supabase secret key or normal password is required in the browser.

### S1b. Optional new-device pairing

```text
choose “配对云同步” → enter family code once
→ Worker validates code → signed HttpOnly device Cookie
→ load family-linked LearnerProfiles → choose learner directly thereafter
```

### S2. Daily/offline review

```text
open cached PWA → render Home from IndexedDB → review
→ commit each rating locally before next card
→ if offline, keep progress pending → synchronize after reconnect
```

### S3. New device

```text
pair the device once → select LearnerProfile
→ download card content → download review events in pages
→ rebuild ReviewState locally → continue review
```

### S4. Content update

```text
compare manifest.updated_at → fetch listed templates/packs when changed
→ validate → generate supported Cards → commit complete import
→ retain progress by stable card_id
```

### S5. Pairing/cloud failure

```text
Worker/Supabase unavailable or device grant expired
→ local review stays available → events remain pending
→ retry after connectivity/pairing recovery
```

## 4. Logical View

Identity and content are different concepts:

```text
FamilySpace      server-configured ownership boundary for this small family
DeviceGrant      signed Worker Cookie created after one-time pairing
LearnerProfile   local-first settings/progress identity; may link to FamilySpace
ContentProfile   GitHub card source such as `manman`; not a login identity
```

A LearnerProfile references one ContentProfile. Multiple learners can review the same ContentProfile without sharing progress.

Domain chain:

```text
DraftNote → Note → Card
LearnerProfile + Card → ReviewEvent → materialized ReviewState
```

- ReviewEvent is the synchronized fact.
- ReviewState is a local materialized view rebuilt from ordered events.
- `card_id = sha256(note_id + "|" + template_id + "|" + card_type)` using lowercase hexadecimal.

Feature modules:

```text
sync-access   device pairing/status/unpair
profiles      local-first LearnerProfile create/select and cloud cache
content-sync  GitHub manifest/template/pack import
review        queue, UI, rating and scheduler
progress-sync pending push, remote pull and replay
tts           voice resolution/playback
settings      learner preferences
local-store   Dexie schema/transactions
```

Dependency rule:

```text
React UI → feature use cases → pure domain
feature use cases → ports → Dexie/GitHub/Supabase/Web Speech adapters
```

Domain code never imports React, Dexie, Supabase or browser globals.

## 5. Process View

### 5.1 Startup

```text
1. Render cached shell and open Dexie.
2. Load local LearnerProfiles; when none is selected, show ProfilesPage.
3. Create/select a LearnerProfile without waiting for auth or network.
4. Check the persisted device grant through same-origin `/api` without blocking local UI.
5. When paired, refresh family-linked Profiles and synchronize progress in the background.
6. Check the public card manifest independently of cloud state.
```

Startup does not wait for network after local initialization.

### 5.2 Rating transaction

One Dexie transaction performs:

```text
read ReviewState → create UUID ReviewEvent
→ calculate scheduler-v1 state → write pending event + ReviewState
→ commit → advance UI
```

If it fails, the UI stays on the current Card.

### 5.3 Progress synchronization

```text
1. Worker verifies the signed device Cookie and configured family boundary.
2. Upload pending events in bounded batches.
3. Insert with event_id conflict ignored; Supabase assigns sync_seq.
4. Pull events where sync_seq > local cursor, page by page.
5. Upsert locally by event_id.
6. Replay affected cards in canonical sync_seq order.
7. Mark events synced and advance cursor transactionally.
```

Triggers: app open after local render, browser `online`, review completion, manual sync and a short active-use debounce. No exact background schedule is promised.

Convergence rules:

- `event_id` makes retries idempotent.
- `sync_seq` is the cross-device order.
- Pending local events follow synchronized events until upload.
- Replay uses `effective_at = max(previous.last_reviewed_at, event.reviewed_at)` so a late upload cannot move time backwards.
- The same event set and scheduler version must create the same ReviewState on every device.

### 5.4 Content synchronization

```text
fetch/validate manifest → return unchanged when timestamp matches
→ fetch every listed template/pack → parse non-empty JSONL records
→ validate Notes independently → generate recognition/production
→ commit complete import → suspend removed Cards, retain progress
```

A missing required pack preserves the previous dataset. Invalid rows are skipped and reported without discarding valid rows.

## 6. Development View

Use lightweight Ports and Adapters inside feature folders. Create a port only for a real external boundary that needs a production adapter and a test fake:

```text
DeviceAccessClient  CardSource  ProgressRemote  LocalStore  SpeechPlayer  Clock
```

No dependency-injection container is used; `src/app/bootstrap.ts` assembles adapters. Do not create interfaces for pure functions or one-line utilities.

Planned directory:

```text
src/
├─ app/                    App, router, bootstrap, small AppContext
├─ features/
│  ├─ sync-access/         one-time pairing page + device access port
│  ├─ profiles/
│  ├─ content-sync/
│  ├─ review/
│  ├─ progress-sync/
│  ├─ settings/
│  └─ tts/
├─ domain/                 models, cardGenerator, scheduler, replay
├─ infrastructure/
│  ├─ db/                  Dexie database/schema
│  ├─ github/              public CardSource
│  ├─ worker/              same-origin Profile/progress adapters
│  └─ speech/              Web Speech adapter
├─ shared/                 errors, result, ids, time
└─ styles/

supabase/
├─ config.toml
├─ migrations/
└─ seed.sql

tests/{unit,integration,e2e}/
```

State rules:

- Session and selected LearnerProfile: one small React context.
- Persistent business state: Dexie observable queries.
- Page interaction: local React state/reducer.
- No Redux, Zustand, global event bus or server-state cache library.
- Shared UI is created only after a second real use appears.

Typed boundary errors:

```text
DEVICE_NOT_PAIRED, PAIRING_CODE_INVALID, NETWORK_ERROR
INVALID_MANIFEST, INVALID_PACK_ROW, DB_TRANSACTION_FAILED
PROGRESS_PUSH_FAILED, PROGRESS_PULL_FAILED, PROGRESS_REPLAY_FAILED
TTS_UNAVAILABLE, IMPORT_INVALID
```

## 7. Deployment View

```text
Cloudflare Worker + static PWA
       │ browser
       ├── public read ── GitHub `card`
       └── signed device Cookie ── same-origin `/api`
                                  └── server secret ── Supabase Postgres
                                                       schema `english_recall`
```

Frontend configuration:

```text
VITE_CARD_REPOSITORY_BASE_URL
VITE_PROGRESS_API_BASE_URL (optional; empty means same origin)
```

These are not privileged credentials. Database passwords, secret/service-role keys, GitHub PATs and Cloudflare tokens never enter frontend code, Git, logs or Project Sources.

Worker-only Secrets:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
FAMILY_OWNER_USER_ID
FAMILY_PAIRING_CODE
DEVICE_SESSION_SECRET
```

`FAMILY_OWNER_USER_ID` points to the existing bootstrap `auth.users.id` used by the current foreign keys; this is a server-side ownership anchor, not a frontend account. The Worker exposes only:

```text
GET  /api/device/status
POST /api/device/pair
POST /api/device/unpair
GET/POST /api/profiles
GET/POST /api/review-events
```

No update/delete/admin endpoint is part of the MVP.

The shared Supabase project uses a dedicated exposed `english_recall` schema. Other apps use other schemas. Every exposed table has explicit grants and RLS.

## 8. Domain and Local Data

Key types:

```ts
type LearnerProfile = {
  learnerProfileId: string; // UUID
  cloudSyncId?: 'family'; // present only when linked to FamilySpace
  displayName: string;
  contentProfileId: string;
  uiLang: 'zh-CN';
  nativeLang: string;
  defaultLearningLang: string;
  englishVoiceLocale: 'en-US' | 'en-GB';
  spanishVoiceLocale: 'es-MX' | 'es-US' | 'es-ES';
  ttsRate: 0.75 | 1 | 1.25;
  listeningModeDefault: boolean;
  dailyNewCardLimit: number;
};

type ReviewEvent = {
  eventId: string;
  learnerProfileId: string;
  cardId: string;
  rating: 'unknown' | 'fuzzy' | 'known';
  reviewedAt: string;
  effectiveAt: string;
  deviceId: string;
  schedulerVersion: 1;
  remoteSeq?: number;
  syncStatus: 'pending' | 'synced';
};

type ReviewState = {
  learnerProfileId: string;
  cardId: string;
  state: 'new' | 'learning' | 'review' | 'relearning' | 'mature';
  dueAt: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt?: string;
  lastEventId?: string;
};
```

ReviewState is derived and is not the cloud synchronization authority.

Current Dexie v2 schema:

```ts
learnerProfiles: '&learnerProfileId, cloudSyncId, contentProfileId'
notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]'
cards: '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]'
reviewEvents: '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq'
reviewStates: '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]'
syncStates: '&learnerProfileId'
contentSyncStates: '&contentProfileId'
```

Review queries use `learnerProfileId`; content queries use `contentProfileId`.

## 9. Supabase Data and RLS

MVP remote tables in schema `english_recall`:

```sql
learner_profiles (
  learner_profile_id uuid primary key,
  user_id uuid not null references auth.users,
  display_name text not null,
  content_profile_id text not null,
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

review_events (
  sync_seq bigint generated always as identity unique,
  event_id uuid primary key,
  user_id uuid not null references auth.users,
  learner_profile_id uuid not null references learner_profiles,
  card_id text not null,
  rating text not null,
  reviewed_at timestamptz not null,
  effective_at timestamptz not null,
  device_id text not null,
  scheduler_version smallint not null,
  created_at timestamptz not null default now()
)
```

Constraints limit rating, scheduler version, device-id pattern and text lengths.

Access intent:

```text
browser: no direct Supabase credential or table access
Worker: service secret bypasses RLS, so every query/write filters FAMILY_OWNER_USER_ID
Worker event insert: learner_profile_id must belong to FAMILY_OWNER_USER_ID
review_events update/delete: no Worker endpoint
legacy authenticated RLS policies remain defense-in-depth during migration
```

Integration tests use two users. A publishable key without an authenticated user must read/write neither table.

## 10. Scheduler and Queue

Initial rating:

```text
unknown → relearning, +10 minutes, interval 0
fuzzy   → learning, +1 day, interval 1
known   → review, +3 days, interval 3
```

Existing state:

```text
unknown → relearning, +10 minutes, lapse +1
fuzzy   → review, max(1, round(interval × 1.5)) days
known   → review/mature, min(180, max(3, round(interval × 2.5))) days
```

`mature` begins at 90 days. Scheduler v1 is a pure function used by both normal rating and replay.

Queue order:

```text
overdue relearning → overdue learning → due review/mature → new within limit
```

## 11. Pages, TTS and PWA

P0 routes:

```text
/pair-device  one-time family device pairing
/profiles  default select/create LearnerProfile route; no login required
/          Home
/review    review session
/settings  preferences and both sync controls
```

Home distinguishes content sync from progress sync and shows due/learning/new counts. A successful card download must never be shown as successful progress synchronization.

Voice fallback:

```text
exact locale → language prefix → browser language default → system default
```

English locales are en-US/en-GB; Spanish locales are es-MX/es-US/es-ES; rates are 0.75/1.0/1.25. Listening mode reuses the same Card and ReviewState.

The service worker caches only the app shell and versioned assets. Business data remains in IndexedDB. Updates never interrupt an in-flight rating transaction.

## 12. Security and Recovery

- RLS remains enabled and anonymous direct table access is denied.
- Supabase URL/secret, family owner UUID, pairing code and signing secret are Worker Secrets.
- Device grants are HMAC-signed HttpOnly/Secure/SameSite Cookies scoped to `/api`.
- External payloads are validated at boundaries.
- Failed content import never deletes the last successful dataset.
- Failed progress push never deletes pending events.
- Sign-out asks before clearing local learner data.
- Progress export excludes auth tokens and platform credentials.
- GitHub `progress` is not an MVP runtime database; it remains reserved for a possible future cold backup.

## 13. Tests and Traceability

| Need | Modules | Minimum proof |
|---|---|---|
| Local-first learner | profiles, db | create/select persists without account/network |
| One-time device pairing | sync-access, Worker | invalid code denied; signed Cookie persists |
| Family boundary | profiles, Worker, RLS | every Profile/Event operation filtered by owner UUID |
| Existing cards | content-sync | current manifest/templates/packs fixture import |
| Offline review | review, db, PWA | rating persists with network disabled |
| Stable scheduling | scheduler | matrix, caps and fixed-clock tests |
| Multi-device convergence | progress-sync, replay | interleaved events converge |
| Idempotent retry | progress-sync | duplicate upload creates one row |
| Cloud failure safety | progress-sync | pending events survive failure |
| TTS/listening | tts, review | fallback and hidden-before-reveal tests |
| Installable PWA | app, deployment | E2E plus iPhone/Android acceptance |

Test layers: unit domain tests; Dexie/Supabase/RLS integration tests; component tests; critical E2E flows; manual device/TTS acceptance.

## 14. Delivery Plan

| Milestone | Scope | Estimate |
|---|---|---:|
| M1 | Vite/PWA, feature structure, Dexie, scheduler/replay | 2 days |
| M2 | Supabase schema, Profile and RLS foundation | 1.5 days |
| M3 | Manifest/packs/templates, validation, Card generation | 2 days |
| M4 | Family pairing, Worker API and Event push/pull/replay | 2 days |
| M5 | TTS/listening and remaining Review UI | 2 days |
| M6 | Offline/update, export/import, Cloudflare deploy | 1.5 days |
| M7 | Automated tests and device fixes | 2–3 days |

Estimated total: `13–15 working days`. It is a planning range, not a code-volume target.

## 15. Acceptance Gate

1. First use and daily use can select a LearnerProfile without login.
2. A new device pairs once without email login, then loads family-linked LearnerProfiles directly.
3. Current card data imports without hardcoded Note counts.
4. Recognition and Production work.
5. Every rating persists before UI navigation.
6. Offline ratings sync after reconnect.
7. Interleaved two-device events converge.
8. Content/progress failures preserve local data.
9. RLS blocks cross-user access.
10. English/Spanish TTS fallback works.
11. Export/import round-trips without secrets.
12. PWA installation is verified on iPhone and Android.
13. Build, typecheck and test results are reported honestly.

## 16. Upgrade Triggers

| Observed trigger | Possible upgrade |
|---|---|
| Family members must manage each other | memberships/invitations/roles |
| Event rebuild becomes slow | remote materialized state/checkpoints |
| Open devices need instant updates | Supabase Realtime |
| Multiple independent households are required | memberships plus scoped household identifiers |
| Card data becomes private | authenticated card API |
| Browser voices are inadequate | cloud TTS/native app |
| Pack sync becomes costly | Builder hashes/sealed packs |

Until a trigger occurs, these are not development tasks.
