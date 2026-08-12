# English Recall Hub｜Current Core Design

Version: `0.2.0-web-mvp-design`  
Updated: `2026-08-12`  
Branch: `dev`

## 1. Product Positioning

English Recall Hub 是一个面向个人和家庭的多语言主动回忆工具。它不是通用词典、课程平台或完整 SaaS，而是把 ChatGPT 学习记录转化为可持续复习内容的轻量系统。

核心闭环：

```text
ChatGPT learning question
→ DraftNote
→ Builder validation / dedupe / normalization
→ formal Note
→ generated Card
→ Web/PWA local review
→ local SRS progress
→ recent cloud backup
```

第一版的成功标准不是功能数量，而是用户能够在 iPhone、Android 和 PC 上快速打开、选择 Profile、同步卡片、离线复习、朗读并恢复进度。

## 2. Final MVP Architecture

```text
Frontend / PWA
  React + TypeScript + Vite
  React Router
  Dexie + IndexedDB
  Web Speech API
  vite-plugin-pwa

Deployment / Backend
  Cloudflare Workers Static Assets
  Cloudflare Worker API
  Cloudflare Secrets

Content / Backup
  GitHub draft branch
  GitHub card branch
  GitHub progress branch
```

第一版不开发 React Native/Expo、SQLite 原生应用、App Store/TestFlight 或 APK。

## 3. Branch Responsibilities

```text
main       stable documentation

dev        application code, tests and project documents

draft      raw DraftNote inbox written by ChatGPT/import flow

card       validated formal Notes, Templates and manifest

progress   recent profile/device progress snapshots
```

Hard boundaries:

- ChatGPT writes DraftNote only; it does not bypass Builder.
- Builder owns formal Note/Card publishing.
- Web App reads `card` and writes review state locally first.
- Worker writes `progress` with backend-only GitHub credentials.
- `draft`, `card`, `progress` must never be mixed.

## 4. Runtime Data Flow

### 4.1 Draft to Card

```text
ChatGPT Project
→ draft/profiles/{profile_id}/inbox/YYYY/MM/YYYY-MM-DD.jsonl
→ Builder validates schema
→ checks dedupe_key
→ rejects / merges / publishes
→ card/profiles/{profile_id}/manifest.json
→ card/profiles/{profile_id}/packs/*.jsonl
→ card/profiles/{profile_id}/templates/*.json
```

### 4.2 Card Sync to Browser

```text
Open PWA
→ choose local Profile
→ fetch card manifest
→ compare manifest.updated_at with local sync state
→ if changed, fetch listed packs/templates
→ validate with Zod
→ upsert Notes
→ generate supported Cards
→ upsert Cards
→ keep previous local data if sync fails
```

Current compatibility rule:

- Existing `manman` manifest has 130 Notes in 27 packs.
- Existing pack `sha256` fields are null.
- MVP therefore uses `manifest.updated_at`; it does not claim checksum verification.
- When the manifest changes, all listed packs are re-read and upserted. This is acceptable at the current scale.

### 4.3 Review

```text
IndexedDB due query
→ recognition / production card
→ reveal answer
→ unknown / fuzzy / known
→ update ReviewState immediately
→ recalculate dueAt
→ continue offline
```

### 4.4 Progress Backup

```text
Local ReviewState
→ backup trigger
→ Worker API validation
→ Worker uses GitHub Secret
→ progress/profiles/{profile_id}/devices/{device_id}/latest.json
→ progress/profiles/{profile_id}/devices/{device_id}/snapshots/YYYY-MM-DD.json
```

PWA cannot guarantee an exact background schedule. Backup is best-effort and is triggered by app open, review completion, elapsed backup interval and manual action.

## 5. Core Domain Model

### 5.1 DraftNote

Raw AI-generated learning input. It may be incomplete or duplicated and is never reviewed directly.

### 5.2 Note

One Note equals one knowledge point.

Required MVP fields:

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
status
created_at
updated_at
```

Multilingual extension fields in browser storage:

```text
learning_lang
native_lang
```

If old Notes do not contain them, defaults are inferred from Profile settings and `pronunciation.lang`.

### 5.3 Card

A concrete review prompt generated from a Note and Template.

Stable ID:

```text
card_id = hash(note_id + template_id + card_type)
```

MVP enabled types:

```text
recognition
production
```

Not enabled in MVP:

```text
cloze
output
contrast
```

Reason: current templates refer to `cloze_sentence`, while current formal Notes do not provide that field. Unsupported templates must be ignored rather than producing broken cards.

### 5.4 ReviewState

Minimum fields:

```text
profile_id
card_id
state
due_at
interval_days
review_count
lapse_count
last_reviewed_at
updated_at
```

### 5.5 ProgressSnapshot

Minimum cloud-backup fields:

```text
schema_version
profile_id
device_id
created_at
card_manifest_updated_at
review_states
settings_subset
```

The snapshot backs up progress only; it does not duplicate formal Notes or Cards.

## 6. Local Database

Dexie/IndexedDB is the runtime source of truth.

MVP tables:

```text
profiles
settings
notes
cards
reviewStates
syncStates
```

No full event-log table is required for MVP. Review history, analytics and complex conflict resolution are deferred.

Profile isolation is mandatory. Every local Note, Card, ReviewState and SyncState query must include `profile_id`.

## 7. Profile and Security Model

The first version has no registration, normal password, GitHub OAuth or user-entered GitHub token.

Normal flow:

```text
Open app
→ choose Profile
→ review
```

Cloud backup enrollment on a new device uses a one-time setup link or QR containing a Profile sync key. The PWA stores the key locally and removes it from the visible URL. Later launches only show Profile selection.

Security boundaries:

- GitHub PAT exists only in Cloudflare Secret.
- Profile sync keys are never committed to GitHub.
- Worker validates profile whitelist, sync key, device_id and request size.
- First version assumes one primary write device per Profile.
- Local-only mode remains usable without a sync key.

## 8. Review Scheduling

The MVP uses a transparent interval model, not FSRS.

Initial scheduling:

```text
unknown → 10 minutes
fuzzy   → 1 day
known   → 3 days
```

Subsequent scheduling:

```text
unknown → 10 minutes; lapse_count + 1
fuzzy   → max(1 day, interval × 1.5)
known   → min(180 days, max(3 days, interval × 2.5))
```

Daily queue priority:

```text
overdue learning/relearning
→ due review
→ new cards within daily limit
```

Default daily new-card limit: 10. This must be configurable per Profile.

## 9. Pronunciation and Languages

Use Web Speech API only.

MVP supports:

```text
English: en-US / en-GB
Spanish: es-MX with fallback to es-US / es-ES
Speed: 0.75 / 1.0 / 1.25
```

Note fields remain minimal:

```json
{
  "pronunciation": {
    "text": "be concerned with",
    "lang": "en",
    "hint_cn": "optional"
  }
}
```

The browser selects an available voice matching the Profile preference. If no exact voice exists, fall back by language prefix, then to the system default.

Web MVP does not implement persistent audio-file cache, cloud TTS, IPA generation or pronunciation scoring.

## 10. Offline and PWA

PWA service worker caches the application shell. Formal Note/Card data and progress remain in IndexedDB.

Offline behavior:

- After one successful sync, review must work without network.
- Network failure must not delete local data.
- Card sync, backup and restore show explicit status.
- Backup failure leaves local progress intact and marks it pending.

## 11. MVP Pages

P0 pages:

```text
Profile Select
Home
Review
Settings / Sync
```

P1 page:

```text
Library / Search
```

The UI is mobile-first, but must remain usable on desktop.

## 12. Detailed Development Baseline

The authoritative implementation-level design is:

```text
docs/design/web-mvp-framework-design.md
```

It defines scope, modules, folder structure, APIs, data schema, use cases, estimates, acceptance criteria and risks.

## 13. MVP Exclusions

- Native mobile app.
- Full account and permission system.
- GitHub OAuth or browser PAT input.
- Multi-device realtime merge.
- Exact background task or push notification.
- Advanced card types.
- Cloud TTS/audio cache/pronunciation scoring.
- Cloud database, payment, ads and community marketplace.
