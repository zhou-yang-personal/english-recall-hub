# English Recall Hub｜Latest Handoff

Version: `0.2.0-web-mvp-design`  
Updated: `2026-08-12`  
Source-of-truth branch: `dev`

## 1. Current Direction

The project has moved from a proposed React Native/Expo mobile app to a Web/PWA MVP.

Approved first-version stack:

```text
React + TypeScript + Vite
React Router
Dexie + IndexedDB
Zod
Web Speech API
vite-plugin-pwa
Cloudflare Workers Static Assets
Cloudflare Worker API
GitHub card/progress branches
```

User experience target:

```text
open app
→ choose Profile
→ sync formal cards
→ review offline
→ listen
→ save locally
→ back up / restore progress
```

Normal use has no account registration, normal password, GitHub OAuth or user-entered GitHub token.

## 2. Architecture Boundaries

```text
ChatGPT Project
→ draft DraftNote
→ Builder validation/dedupe/normalization
→ card formal Notes/Templates
→ Web/PWA IndexedDB runtime
→ simple SRS
→ Worker-backed progress snapshots
```

- ChatGPT does not write formal Card data directly.
- Browser IndexedDB is the runtime source of truth.
- GitHub `card` is the formal content source.
- GitHub `progress` is a bounded backup source, not a realtime database.
- GitHub write credentials are stored only in Cloudflare Secrets.
- A new device may use a one-time Profile setup link; later use only selects a Profile.

## 3. Current Data Reality

The current `card/profiles/manman/manifest.json` contains:

```text
schema_version: 0.1.0
note_count: 130
listed packs: 27
pack sha256: null
```

MVP sync rule:

```text
compare manifest.updated_at
→ if changed, fetch listed packs/templates
→ validate and upsert
→ retain last local data on failure
```

Current formal templates include recognition, production and some unsupported card types. Because current Notes do not provide `cloze_sentence`, MVP enables only:

```text
recognition
production
```

## 4. Documentation Baseline

The approved development baseline is defined by:

```text
AGENTS.project.md
docs/design/current-core-design.md
docs/design/web-mvp-framework-design.md
docs/requirements/current-requirements.md
```

The detailed design includes:

- Final technical selection.
- Folder and module structure.
- Dexie schema.
- Card sync and generation rules.
- SRS scheduling.
- TTS and listening mode.
- Profile enrollment and Worker security.
- Progress backup/restore API.
- PWA/offline strategy.
- Test plan.
- 22 acceptance use cases.
- 12–13 working-day estimate.
- 4,200–6,500 production LOC estimate.

## 5. MVP Scope

Must implement:

```text
local Profile selection
public card sync
IndexedDB/offline review
recognition + production
unknown/fuzzy/known SRS
English + Spanish TTS
listening mode
local progress
Worker backup/restore
progress export/import
PWA install/mobile layout
```

Not in MVP:

```text
native mobile app
normal account/password
GitHub OAuth/PAT input
multi-device realtime merge
exact background scheduling/push
cloze/output/contrast
cloud TTS/audio cache/IPA/scoring
cloud database/payment/community
```

## 6. Next Development Steps

After this documentation PR is accepted:

1. Initialize Vite + React + TypeScript project on a new task branch.
2. Add Cloudflare Vite/Worker and Wrangler configuration.
3. Add package scripts and update `AGENTS.project.md` with confirmed commands.
4. Implement Dexie schema and Profile selection.
5. Implement manifest/pack/template sync against current card data.
6. Implement recognition/production generation and stable Card IDs.
7. Implement review queue and scheduler.
8. Implement Web Speech API and listening mode.
9. Implement Worker progress backup/restore.
10. Add PWA/offline behavior, tests and device acceptance.

## 7. Estimated Delivery

```text
Full Web MVP with backup/restore: 12–13 working days
Local-only MVP without cloud backup: 8–9 working days
Production source: 4,200–6,500 LOC
Tests: 1,200–2,000 LOC
```

## 8. Verification Status

This handoff describes a documentation/design baseline only.

```text
Application build: not run; application project not initialized
Unit tests: not run; no application code yet
E2E tests: not run; no application code yet
CI: not configured
```

Do not claim implementation completion from this document update.
