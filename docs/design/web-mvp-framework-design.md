# English Recall Hub Web MVP Framework Design

Version: `0.2.0-web-mvp-design`  
Updated: `2026-08-12`  
Status: Approved development baseline  
Repository: `zhou-yang-personal/english-recall-hub`

## 1. Purpose

This document is the implementation-level baseline for the first usable English Recall Hub Web/PWA.

It is intentionally scoped to the current real need:

```text
family use
→ open on iPhone / Android / PC
→ choose Profile
→ sync formal cards
→ review offline
→ listen to pronunciation
→ preserve and recover progress
```

The design avoids building an account platform, native mobile app or general learning SaaS before the core review loop is proven.

## 2. Final Decision

### 2.1 Selected Architecture

```text
React + TypeScript + Vite
+ React Router
+ Dexie / IndexedDB
+ Zod
+ Web Speech API
+ vite-plugin-pwa
+ Cloudflare Workers Static Assets
+ Cloudflare Worker API
+ GitHub card / progress branches
```

### 2.2 Why Web/PWA

The Web/PWA approach directly satisfies the first-version constraints:

- One codebase for iPhone, Android and desktop.
- No App Store, TestFlight, APK or Apple certificate workflow.
- Immediate deployment through a URL.
- Home-screen installation and offline app shell.
- Browser IndexedDB is sufficient for card and progress scale.
- System TTS supports English and Spanish without cloud cost.
- A Worker can hide GitHub write credentials from the browser.

### 2.3 Rejected for MVP

```text
React Native / Expo
Flutter
native iOS / Android
full account backend
GitHub OAuth
browser PAT input
D1 / KV / R2
cloud TTS
advanced card engine
realtime multi-device merge
```

These remain future options only if actual use exposes a concrete need.

## 3. Current Repository Reality

The implementation must start from current data, not an imagined clean schema.

Current `card/profiles/manman/manifest.json`:

```text
schema_version: 0.1.0
note_count: 130
listed packs: 27
pack sha256: null
```

Current formal Notes already contain the data needed for MVP:

```text
note_id
profile_id
type
core
meaning_cn
explanation_cn
source_sentence
examples
pronunciation
dedupe_key
collections
tags
source_draft_ids
status
created_at
updated_at
```

Current templates provide recognition and production rules. Phrase and sentence templates also contain cloze rules, but formal Notes do not contain `cloze_sentence`. Therefore:

```text
MVP enabled: recognition, production
MVP disabled: cloze, output, contrast
```

The client must ignore unsupported card types safely.

## 4. System Context

```text
┌─────────────────────────────────────────────┐
│ ChatGPT English-learning Projects           │
└──────────────────────┬──────────────────────┘
                       │ DraftNote JSONL
                       ▼
┌─────────────────────────────────────────────┐
│ GitHub draft branch                         │
└──────────────────────┬──────────────────────┘
                       │ scheduled Builder
                       ▼
┌─────────────────────────────────────────────┐
│ GitHub card branch                          │
│ manifest + packs + templates                │
└──────────────────────┬──────────────────────┘
                       │ public read
                       ▼
┌─────────────────────────────────────────────┐
│ Cloudflare-hosted Web/PWA                    │
│ React UI + IndexedDB + Web Speech API        │
└──────────────────────┬──────────────────────┘
                       │ progress backup API
                       ▼
┌─────────────────────────────────────────────┐
│ Cloudflare Worker                           │
│ validates Profile/device/sync key            │
└──────────────────────┬──────────────────────┘
                       │ backend GitHub token
                       ▼
┌─────────────────────────────────────────────┐
│ GitHub progress branch                      │
│ latest + bounded daily snapshots            │
└─────────────────────────────────────────────┘
```

## 5. Deployment Model

Use one Cloudflare Worker project with Static Assets.

```text
browser request /
→ serve built PWA assets

browser request /api/*
→ execute Worker handler
```

Benefits:

- One deployment target.
- Same-origin API calls.
- No separate CORS deployment complexity.
- Worker Secrets available to progress endpoints.
- Local development can exercise frontend and Worker together.

Planned production URL:

```text
https://english-recall-hub.<account>.workers.dev
```

A custom domain is optional and outside MVP acceptance.

## 6. Project Structure

```text
/
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx
│  │  └─ providers.tsx
│  ├─ pages/
│  │  ├─ ProfileSelectPage.tsx
│  │  ├─ HomePage.tsx
│  │  ├─ ReviewPage.tsx
│  │  └─ SettingsSyncPage.tsx
│  ├─ components/
│  │  ├─ ProfileCard.tsx
│  │  ├─ ReviewCard.tsx
│  │  ├─ ReviewRatingButtons.tsx
│  │  ├─ TtsButton.tsx
│  │  ├─ SyncStatus.tsx
│  │  ├─ CountSummary.tsx
│  │  └─ ConfirmDialog.tsx
│  ├─ domain/
│  │  ├─ note.ts
│  │  ├─ card.ts
│  │  ├─ cardGenerator.ts
│  │  ├─ reviewState.ts
│  │  ├─ scheduler.ts
│  │  └─ progressSnapshot.ts
│  ├─ db/
│  │  ├─ db.ts
│  │  ├─ schema.ts
│  │  └─ repositories/
│  │     ├─ profileRepository.ts
│  │     ├─ noteRepository.ts
│  │     ├─ cardRepository.ts
│  │     ├─ reviewRepository.ts
│  │     └─ syncRepository.ts
│  ├─ services/
│  │  ├─ cardSync/
│  │  │  ├─ cardSourceClient.ts
│  │  │  ├─ cardSyncService.ts
│  │  │  └─ jsonlParser.ts
│  │  ├─ tts/
│  │  │  ├─ voiceResolver.ts
│  │  │  └─ ttsService.ts
│  │  ├─ progress/
│  │  │  ├─ progressApiClient.ts
│  │  │  ├─ progressExport.ts
│  │  │  └─ progressImport.ts
│  │  └─ setup/
│  │     └─ profileEnrollment.ts
│  ├─ schemas/
│  │  ├─ manifestSchema.ts
│  │  ├─ noteSchema.ts
│  │  ├─ templateSchema.ts
│  │  └─ progressSchema.ts
│  ├─ config/
│  │  ├─ profiles.ts
│  │  └─ runtime.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  └─ global.css
│  └─ utils/
│     ├─ hash.ts
│     ├─ time.ts
│     └─ result.ts
├─ worker/
│  ├─ index.ts
│  ├─ routes/
│  │  ├─ health.ts
│  │  ├─ backup.ts
│  │  └─ restore.ts
│  ├─ services/
│  │  ├─ githubContentsClient.ts
│  │  ├─ progressStore.ts
│  │  └─ retentionService.ts
│  ├─ security/
│  │  ├─ auth.ts
│  │  └─ validation.ts
│  └─ types.ts
├─ tests/
│  ├─ unit/
│  ├─ component/
│  └─ e2e/
├─ public/
│  └─ icons/
├─ package.json
├─ vite.config.ts
├─ wrangler.jsonc
└─ tsconfig.json
```

No separate UI package, state-management package or backend framework is required.

## 7. Frontend Pages

### 7.1 Profile Select

Responsibilities:

- Read configured Profiles.
- Show display name and local/cloud status.
- Switch current Profile.
- Process one-time enrollment URL on a new device.
- Allow local-only mode.

Normal daily experience:

```text
open app → tap Profile → Home
```

### 7.2 Home

Show:

```text
due count
learning/relearning count
new count
last card sync
last progress backup
pending backup state
```

Primary actions:

```text
Start Review
Sync Cards
Backup Progress
```

### 7.3 Review

States:

```text
loading queue
question
answer revealed
session complete
no due cards
```

Controls:

```text
play TTS
replay TTS
reveal answer
unknown / fuzzy / known
exit session
```

### 7.4 Settings / Sync

Settings:

```text
English accent
Spanish accent
TTS speed
listening mode default
daily new-card limit
backup interval
```

Operations:

```text
sync cards
backup now
check remote backup
restore
export progress
import progress
clear local Profile data with confirmation
```

### 7.5 Library

Library/search is P1. Do not block MVP delivery on it.

## 8. Local Database Design

Use one Dexie database, versioned from day one.

### 8.1 Tables

```text
profiles
settings
notes
cards
reviewStates
syncStates
```

### 8.2 Suggested Dexie Schema

```ts
profiles: '&profileId'
settings: '&profileId'
notes: '&[profileId+noteId], profileId, [profileId+dedupeKey], [profileId+status]'
cards: '&[profileId+cardId], profileId, [profileId+noteId], [profileId+status]'
reviewStates: '&[profileId+cardId], [profileId+dueAt], [profileId+state]'
syncStates: '&profileId'
```

### 8.3 Profile

```ts
type Profile = {
  profileId: string;
  displayName: string;
  nativeLang: string;
  defaultLearningLang: string;
  cardManifestUrl: string;
  cloudBackupEnabled: boolean;
  primaryDeviceId: string;
  createdAt: string;
  updatedAt: string;
};
```

The Profile sync key is stored separately from exported business data and must never be included in progress export.

### 8.4 Settings

```ts
type ProfileSettings = {
  profileId: string;
  uiLang: 'zh-CN';
  englishVoiceLocale: 'en-US' | 'en-GB';
  spanishVoiceLocale: 'es-MX' | 'es-US' | 'es-ES';
  ttsRate: 0.75 | 1 | 1.25;
  listeningModeDefault: boolean;
  dailyNewCardLimit: number;
  backupIntervalHours: number;
};
```

### 8.5 Note

The browser Note mirrors the formal Note and adds normalized language fields:

```ts
type LocalNote = {
  profileId: string;
  noteId: string;
  type: 'word' | 'phrase' | 'sentence' | 'grammar' | 'expression';
  core: string;
  meaningCn: string;
  explanationCn?: string;
  sourceSentence?: string;
  examples: Array<{ en?: string; es?: string; target?: string; cn: string }>;
  pronunciationText?: string;
  pronunciationLang?: string;
  pronunciationHintCn?: string;
  learningLang: string;
  nativeLang: string;
  dedupeKey: string;
  collections: string[];
  tags: string[];
  status: 'active' | 'mature' | 'suspended' | 'archived';
  sourceUpdatedAt?: string;
};
```

### 8.6 Card

```ts
type LocalCard = {
  profileId: string;
  cardId: string;
  noteId: string;
  templateId: string;
  cardType: 'recognition' | 'production';
  front: string;
  back: string;
  status: 'active' | 'suspended';
  sourceUpdatedAt?: string;
};
```

### 8.7 ReviewState

```ts
type ReviewState = {
  profileId: string;
  cardId: string;
  state: 'new' | 'learning' | 'review' | 'relearning' | 'mature';
  dueAt: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt?: string;
  updatedAt: string;
};
```

### 8.8 SyncState

```ts
type SyncState = {
  profileId: string;
  manifestUpdatedAt?: string;
  lastSuccessfulCardSyncAt?: string;
  lastCardSyncError?: string;
  lastSuccessfulBackupAt?: string;
  backupPending: boolean;
  remoteBackupCreatedAt?: string;
};
```

## 9. Card Source Sync

### 9.1 Source URLs

Manifest:

```text
https://raw.githubusercontent.com/zhou-yang-personal/english-recall-hub/card/profiles/{profile_id}/manifest.json
```

Pack/template paths are resolved from manifest entries against the same repository/branch base.

### 9.2 Algorithm

```text
1. fetch manifest
2. validate manifest with Zod
3. compare updated_at with SyncState
4. if unchanged, return unchanged
5. fetch all listed templates
6. fetch all listed packs
7. parse JSONL line by line
8. validate each Note independently
9. collect valid Notes and row errors
10. generate supported Cards
11. transactionally upsert Notes and Cards
12. preserve existing ReviewState by stable card_id
13. remove local active Notes/Cards no longer present only after complete successful import
14. update SyncState
```

### 9.3 Partial Invalid Rows

One invalid JSONL row must not fail the whole pack.

Sync result includes:

```text
packs requested
packs loaded
notes valid
notes skipped
cards generated
warnings
```

### 9.4 Failure Rule

If manifest or required pack retrieval fails before a complete import:

```text
do not delete or replace the previous local dataset
record failure
show “同步失败，继续使用本地数据”
```

### 9.5 Future Hash Upgrade

When Builder later supplies reliable per-pack hashes, SyncState may store hashes and fetch only changed packs. This is P1 and must not be implemented with fabricated null hashes.

## 10. Card Generation

### 10.1 Supported Templates

Only template entries with:

```text
card_type = recognition | production
```

are used.

### 10.2 Minimal Interpolation

Supported scalar variables:

```text
{{core}}
{{meaning_cn}}
```

The MVP does not implement a general template expression language.

### 10.3 Stable IDs

```ts
cardId = sha256(`${noteId}|${templateId}|${cardType}`)
```

A deterministic browser-compatible hash function must be tested. If Web Crypto SHA-256 complicates synchronous generation, a stable pure TypeScript hash may be used, but it cannot change after release.

### 10.4 Update Behavior

When Note content changes but stable identifiers remain:

```text
update Card front/back
retain ReviewState
```

When a Card disappears from supported templates:

```text
mark local Card suspended
retain ReviewState for possible future return
```

## 11. Review Queue and Scheduler

### 11.1 Queue Query

```text
selected profile
AND card status active
AND note status active/mature
AND dueAt <= now
```

Then add new Cards up to daily limit.

### 11.2 Priority

```text
relearning overdue
learning overdue
review overdue
due today
new cards
```

### 11.3 Rating Rules

New Card:

```text
unknown → relearning, due +10 min, interval 0
fuzzy   → learning, due +1 day, interval 1
known   → review, due +3 days, interval 3
```

Existing Card:

```text
unknown → relearning, due +10 min, lapse +1
fuzzy   → review, interval max(1, round(interval × 1.5))
known   → review/mature, interval min(180, max(3, round(interval × 2.5)))
```

A Card may become `mature` when interval reaches 90 days. Mature is a label; it still remains reviewable when due.

### 11.4 Atomic Save

The rating operation updates ReviewState before advancing to the next Card. If it fails, the UI stays on the current Card and displays an error.

## 12. TTS and Listening Mode

### 12.1 Voice Resolution

```text
exact preferred locale and voice
→ language-prefix match
→ browser default for requested language
→ system default
```

Voice list may load asynchronously. The service must refresh available voices after `voiceschanged`.

### 12.2 Playback

```ts
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = resolvedLocale;
utterance.voice = resolvedVoice;
utterance.rate = configuredRate;
speechSynthesis.cancel();
speechSynthesis.speak(utterance);
```

### 12.3 Listening Mode

```text
enter Card
→ auto/play pronunciation
→ hide core/front target text
→ user recalls
→ reveal answer and text
→ rate with the normal ReviewState
```

Listening mode does not generate duplicate Cards in MVP.

### 12.4 Boundaries

No audio file creation, persistent audio cache, cloud TTS, speech recognition, IPA or pronunciation score.

## 13. Profile Enrollment and Security

### 13.1 Daily User Experience

```text
open app → choose Profile → use app
```

No daily password or GitHub login.

### 13.2 New Device Setup

An administrator creates a one-time setup link or QR for a Profile:

```text
https://app/#/setup?profile=manman&key=<profile-sync-key>
```

The app:

```text
validates Profile exists
stores sync key locally
creates/loads device_id
removes key from visible navigation state
continues to Profile Home
```

Use URL fragment routing so the key is not sent as a normal server query parameter. The app must call `history.replaceState` after saving it.

### 13.3 Worker Secrets

```text
GITHUB_PROGRESS_TOKEN
PROFILE_SYNC_KEYS
ALLOWED_ORIGINS
MAX_BACKUP_BODY_BYTES
SNAPSHOT_RETENTION_DAYS
```

Example logical format:

```json
{
  "manman": "random-long-key",
  "mom": "another-random-long-key"
}
```

Secrets are configured in Cloudflare, never committed.

### 13.4 Worker Request Authentication

Headers:

```text
X-Profile-Id
X-Profile-Sync-Key
X-Device-Id
```

Worker checks:

```text
origin allowlist
profile allowlist
constant-time key comparison where practical
device id safe pattern
body size
Zod payload schema
```

## 14. Worker API

### 14.1 GET /api/health

Response:

```json
{
  "ok": true,
  "service": "english-recall-hub",
  "version": "0.2.0-web-mvp-design"
}
```

### 14.2 POST /api/progress/backup

Request body:

```json
{
  "schema_version": "1.0",
  "profile_id": "manman",
  "device_id": "device_xxx",
  "created_at": "2026-08-12T00:00:00Z",
  "card_manifest_updated_at": "2026-08-11T16:39:31Z",
  "review_states": [],
  "settings_subset": {
    "daily_new_card_limit": 10,
    "tts_rate": 1
  }
}
```

Writes:

```text
progress/profiles/{profile_id}/devices/{device_id}/latest.json
progress/profiles/{profile_id}/devices/{device_id}/snapshots/YYYY-MM-DD.json
```

Backup sequence:

```text
validate request
fetch existing GitHub file SHA if present
create/update latest
create/update today's snapshot
remove snapshots older than retention only when safe
return written paths and timestamp
```

If cleanup fails after latest succeeds, return success with warning rather than reporting total failure.

### 14.3 GET /api/progress/restore

Query:

```text
profile_id
device_id
```

Authentication uses the same headers.

Response returns latest snapshot metadata and payload. `404` means no remote backup, not a server error.

### 14.4 Error Shape

```json
{
  "ok": false,
  "code": "INVALID_PROFILE",
  "message": "Profile is not allowed"
}
```

Do not expose GitHub response bodies containing sensitive request context.

## 15. Progress Restore Semantics

Restore flow:

```text
fetch remote latest metadata
→ show backup time/device/profile
→ user confirms
→ validate snapshot
→ transactionally replace ReviewState for selected Profile
→ retain local Notes/Cards
→ mark local sync state restored
```

The MVP does not merge two active device histories. If a user switches primary device, they restore first and then continue on the new device.

## 16. Export / Import

Export contains:

```text
schema_version
profile metadata without secrets
created_at
card_manifest_updated_at
review_states
settings_subset
```

Export excludes:

```text
GitHub token
Profile sync key
browser storage internals
formal Notes/Card content
```

Import validates schema and requires explicit confirmation before replacing local progress.

## 17. PWA and Offline Strategy

Use `vite-plugin-pwa` to generate service worker and web manifest.

Cache:

```text
HTML shell
versioned JS/CSS assets
icons
```

Do not rely on Cache API for Note/Card business data. That data belongs in IndexedDB.

Update behavior:

```text
new app version available
→ show refresh/update prompt
→ avoid refreshing during an active review answer save
```

Offline rules:

- The app shell opens after first successful load.
- Local Profile, Home and Review work offline.
- Card sync/backup/restore show offline status.
- TTS availability depends on installed system voices.

## 18. Error Handling

Define typed result categories:

```text
NETWORK_ERROR
SOURCE_NOT_FOUND
INVALID_MANIFEST
INVALID_PACK_ROW
DB_TRANSACTION_FAILED
TTS_UNAVAILABLE
BACKUP_UNAUTHORIZED
BACKUP_CONFLICT
RESTORE_NOT_FOUND
IMPORT_INVALID
```

User-facing messages are concise and preserve local-data guarantees.

Examples:

```text
同步失败，继续使用上一次已同步的卡片。
备份失败，本地进度已保留，稍后可重试。
当前设备没有可用的西语语音，请在系统中安装语音或更换语音区域。
```

## 19. Testing Strategy

### 19.1 Unit Tests

- Scheduler ratings and interval caps.
- Stable Card ID.
- Note language inference.
- Template filtering/interpolation.
- JSONL parsing with invalid rows.
- Voice fallback selection.
- Progress schema and sanitization.

### 19.2 Component Tests

- Profile selection.
- Home count rendering.
- Review front/reveal/rating states.
- Listening mode text hiding.
- Sync and backup status messages.
- Restore/import confirmation.

### 19.3 Worker Tests

- Valid backup.
- Invalid Profile/key/origin/device.
- Oversized body.
- Existing GitHub file update with SHA.
- No remote restore.
- Retention warning behavior.

### 19.4 End-to-End Tests

Critical browser flows:

```text
first open → select Profile → sync → review → refresh → progress retained
network failure → local review remains usable
backup → clear local progress → restore
Profile A / Profile B isolation
PWA shell offline
```

### 19.5 Manual Device Acceptance

Required:

```text
iPhone Safari installed to home screen
Android Chrome installed to home screen
desktop Chrome or Edge
```

TTS must be manually checked because installed voices vary by device.

## 20. Implementation Milestones

### M1. Repository and PWA Shell — 1 day

```text
Vite/React/TypeScript
Cloudflare Vite/Worker config
routing
PWA manifest/icons placeholder
base mobile layout
```

### M2. Dexie and Profile — 1 day

```text
DB schema
Profile selection
settings
local-only mode
enrollment parsing
```

### M3. Card Source Sync — 2 days

```text
manifest/templates/packs
Zod validation
JSONL parsing
transactional upsert
sync status
```

### M4. Card Generation and Review — 2 days

```text
recognition/production generation
stable IDs
due queue
review UI
scheduler
```

### M5. TTS and Listening — 1 day

```text
voice list/fallback
speed and language settings
listening mode
```

### M6. Progress Backup and Restore — 2 days

```text
Worker auth
GitHub Contents API
latest/daily snapshots
restore
retention
```

### M7. Offline and Export/Import — 1 day

```text
PWA update/offline handling
progress JSON export/import
mobile polish
```

### M8. Test and Device Fixes — 2–3 days

```text
unit/component/e2e
Safari fixes
Android fixes
error-state validation
```

Total: `12–13 working days`.

If cloud backup/restore is deferred, the local-only usable MVP is `8–9 working days`.

## 21. Estimated Code Size

| Area | Files | Production LOC |
|---|---:|---:|
| App/pages/components | 16–22 | 1,500–2,200 |
| Domain/SRS/generation | 6–9 | 600–900 |
| Dexie/repositories | 7–10 | 700–1,000 |
| Sync/TTS/export services | 8–11 | 700–1,100 |
| Worker/security/GitHub | 7–10 | 700–1,100 |
| Config/styles/PWA | 5–8 | 300–500 |
| **Production total** | **35–50** | **4,200–6,500** |

Tests:

```text
10–18 test files
1,200–2,000 LOC
```

This is an estimate for planning, not a target to inflate code volume.

## 22. Build and Deploy Commands

Planned scripts:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run test
npm run test:e2e
npm run deploy
```

Recommended script semantics:

```text
dev       local Vite + Worker development
build     production frontend/Worker build
typecheck tsc without emit
test      Vitest
test:e2e  Playwright
deploy    Wrangler deploy
```

Cloudflare Secret configuration is a deployment prerequisite and must be documented without writing actual values.

## 23. Acceptance Gate

The Web MVP is ready for family trial only when:

1. No login/token input appears in normal use.
2. Existing current card data imports correctly.
3. Recognition and Production review work.
4. Rating survives refresh and offline use.
5. English and Spanish TTS work with fallback.
6. Profile isolation is verified.
7. Sync failure preserves local data.
8. Backup failure preserves local progress.
9. Backup and restore round-trip succeeds.
10. iPhone and Android home-screen installations are manually verified.
11. Unit/component/e2e checks pass or any unexecuted checks are stated explicitly.

## 24. Key Risks and Boundaries

| Risk | Decision |
|---|---|
| Browser data may be cleared | Worker backup + local JSON export |
| TTS voices differ by device | locale fallback; no promised voice name |
| Current packs have no hashes | use manifest.updated_at and full upsert |
| Current cloze templates lack data | disable cloze in MVP |
| Background timing is unreliable | backup on active-use triggers, not exact schedule |
| Profile selector is not authentication | one-time local enrollment protects cloud writes |
| Multi-device conflicts | one primary write device per Profile |
| GitHub Contents API conflicts | fetch current SHA and retry only after re-read |

## 25. Future Upgrade Triggers

Only evaluate the following after real usage shows the trigger:

```text
private card content → add authentication/OAuth
frequent multi-device use → event log and merge
poor browser TTS → cloud TTS/native app
need reliable reminders → native push or scheduled service
large pack sync cost → Builder hashes and sealed packs
need richer recall → add cloze/output after schema support
```

Until a trigger occurs, these are not development tasks.
