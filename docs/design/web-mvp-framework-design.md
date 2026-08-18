# English Recall Hub Web MVP Framework Design

Version: `0.3.2-m2-account-foundation`
Updated: `2026-08-18`
Status: Development baseline
Repository: `zhou-yang-personal/english-recall-hub`

## 1. Purpose and Boundaries

This is the implementation baseline for the first usable Web/PWA. It uses the 4+1 view model so scenarios, runtime behavior, code structure and deployment remain traceable.

Real first-version need:

```text
personal/family use
→ sign in once without a normal password
→ choose a learner Profile
→ sync formal cards from GitHub
→ review and listen offline
→ synchronize progress across the user's devices
```

Selected stack:

```text
React + TypeScript + Vite + React Router
Dexie / IndexedDB + Zod
Web Speech API + vite-plugin-pwa
Supabase Auth + Postgres + Row Level Security
Cloudflare Workers Static Assets
GitHub card branch
```

Key decisions:

| Decision | Why |
|---|---|
| IndexedDB is the runtime source | Review must be immediate and offline |
| GitHub `card` is the content source | Existing Builder/Note pipeline remains valid |
| Supabase stores accounts and progress | Account sync needs queryable user-isolated cloud state |
| Review events are synchronized | Idempotent events converge more safely than whole-snapshot replacement |
| Browser accesses Supabase directly | Auth JWT + RLS avoid a custom progress backend |
| Cloudflare serves static assets only | No server-only MVP use case remains |
| Email OTP is the only MVP sign-in | Passwordless and simple on mobile |

Explicit non-goals:

```text
native apps; normal passwords; social login; public SaaS
family invitations/roles/admin console; real-time collaboration
manual conflict UI; custom API framework; D1/KV/R2
cloud TTS/audio/IPA/scoring; advanced card types
push/exact background jobs; payment/ads/analytics/community
```

Supabase Realtime and Edge Functions are not required unless a later concrete requirement needs them.

## 2. Current Reality

The M1 application shell, local database, scheduler/replay and atomic rating transaction are implemented. M2 adds the Supabase migration/RLS, persisted email passwordless session and LearnerProfile selection/cache. Content import, ReviewEvent remote synchronization, TTS, browser E2E and CI remain subsequent work.

Observed `card/profiles/manman/manifest.json` on `2026-08-17`:

```text
schema_version: 0.1.0
note_count: 137
listed packs: 27
pack sha256: null
```

The count is a snapshot, never a client constant. The client follows the manifest. Recognition and production are supported; cloze/output/contrast are ignored because current Notes lack fields such as `cloze_sentence`. JSONL parsing must process a final record even when the file has no trailing newline.

## 3. Scenario View (+1)

### S1. First sign-in

```text
open PWA → enter email → enter OTP → persist Supabase session
→ load/create LearnerProfile → sync cards/progress → Home
```

No GitHub token, Supabase secret key or normal password appears in the UI.

### S2. Daily/offline review

```text
open cached PWA → render Home from IndexedDB → review
→ commit each rating locally before next card
→ if offline, keep progress pending → synchronize after reconnect
```

### S3. New device

```text
sign in with same account → select LearnerProfile
→ download card content → download review events in pages
→ rebuild ReviewState locally → continue review
```

### S4. Content update

```text
compare manifest.updated_at → fetch listed templates/packs when changed
→ validate → generate supported Cards → commit complete import
→ retain progress by stable card_id
```

### S5. Auth/cloud failure

```text
Supabase unavailable or session expired
→ local review stays available → events remain pending
→ retry after connectivity/session recovery
```

## 4. Logical View

Identity and content are different concepts:

```text
Account          Supabase authenticated user
LearnerProfile   learner settings/progress identity; belongs to one Account
ContentProfile   GitHub card source such as `manman`; not a login identity
```

A LearnerProfile references one ContentProfile. Multiple accounts can review the same ContentProfile without sharing progress.

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
auth          email OTP session
profiles      LearnerProfile create/select
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
2. Load persisted Supabase session.
3. Show SignInPage when no session exists.
4. Load local Profiles and render Home from local data.
5. In background, sync progress and check the card manifest.
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
1. Verify authenticated session.
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
AuthClient  CardSource  ProgressRemote  LocalStore  SpeechPlayer  Clock
```

No dependency-injection container is used; `src/app/bootstrap.ts` assembles adapters. Do not create interfaces for pure functions or one-line utilities.

Planned directory:

```text
src/
├─ app/                    App, router, bootstrap, small AppContext
├─ features/
│  ├─ auth/                page + use cases + Supabase port
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
│  ├─ supabase/            auth/progress adapters
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
AUTH_REQUIRED, AUTH_OTP_FAILED, NETWORK_ERROR
INVALID_MANIFEST, INVALID_PACK_ROW, DB_TRANSACTION_FAILED
PROGRESS_PUSH_FAILED, PROGRESS_PULL_FAILED, PROGRESS_REPLAY_FAILED
TTS_UNAVAILABLE, IMPORT_INVALID
```

## 7. Deployment View

```text
Cloudflare static PWA
       │ browser
       ├── public read ── GitHub `card`
       └── authenticated ── shared Supabase project
                            schema `english_recall`
                            Auth + Postgres + RLS
```

Frontend configuration:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_CARD_REPOSITORY_BASE_URL
```

These are not privileged credentials. Database passwords, secret/service-role keys, GitHub PATs and Cloudflare tokens never enter frontend code, Git, logs or Project Sources.

The shared Supabase project uses a dedicated exposed `english_recall` schema. Other apps use other schemas. Every exposed table has explicit grants and RLS.

## 8. Domain and Local Data

Key types:

```ts
type LearnerProfile = {
  learnerProfileId: string; // UUID
  userId: string;
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

Suggested Dexie v1 schema:

```ts
learnerProfiles: '&learnerProfileId, userId, contentProfileId'
notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]'
cards: '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]'
reviewEvents: '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq'
reviewStates: '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]'
syncStates: '&learnerProfileId'
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

RLS intent:

```text
learner_profiles select/insert/update/delete: user_id = auth.uid()
review_events select/insert: user_id = auth.uid()
event learner_profile_id must belong to the same auth.uid()
review_events update/delete: denied to normal clients
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
/sign-in   email/OTP
/profiles  select/create LearnerProfile
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

- RLS is enabled before frontend access.
- Only the publishable Supabase key enters frontend code.
- External payloads are validated at boundaries.
- Failed content import never deletes the last successful dataset.
- Failed progress push never deletes pending events.
- Sign-out asks before clearing local learner data.
- Progress export excludes auth tokens and platform credentials.
- GitHub `progress` is not an MVP runtime database; it remains reserved for a possible future cold backup.

## 13. Tests and Traceability

| Need | Modules | Minimum proof |
|---|---|---|
| Passwordless account | auth | OTP success/failure and persisted session |
| Profile isolation | profiles, db, RLS | two-user and two-profile isolation |
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
| M2 | Supabase local setup, OTP, Profile, RLS tests | 1.5 days |
| M3 | Manifest/packs/templates, validation, Card generation | 2 days |
| M4 | Home, queue, Review UI, TTS/listening | 2 days |
| M5 | Event push/pull/replay/status/retry | 2 days |
| M6 | Offline/update, export/import, Cloudflare deploy | 1.5 days |
| M7 | Automated tests and device fixes | 2–3 days |

Estimated total: `13–15 working days`. It is a planning range, not a code-volume target.

## 15. Acceptance Gate

1. Email OTP works and daily use does not repeatedly request login.
2. The same Account loads its LearnerProfile on a second device.
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
| Privileged validation is required | RPC/Edge Function/Cloudflare Worker |
| Card data becomes private | authenticated card API |
| Browser voices are inadequate | cloud TTS/native app |
| Pack sync becomes costly | Builder hashes/sealed packs |

Until a trigger occurs, these are not development tasks.
