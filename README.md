# English Recall Hub

English Recall Hub 是一个面向个人和家庭的多语言主动回忆工具。它把 ChatGPT 中学到的单词、短语、句子、语法和表达沉淀为正式 Note/Card，并通过 Web/PWA 完成离线复习、朗读和进度备份。

## Current baseline

- Version: `0.2.0-web-mvp-design`
- Default branch: `main`
- Source-of-truth development branch: `dev`
- Data branches: `draft`, `card`, `progress`
- First delivery platform: Web/PWA on iPhone, Android and desktop browsers

## Product flow

```text
ChatGPT Project
→ draft DraftNote
→ Builder validate / dedupe / normalize
→ card formal Notes and Templates
→ Web/PWA sync to IndexedDB
→ recognition / production review
→ local SRS progress
→ Worker backup to progress branch
```

## Web MVP architecture

```text
React + TypeScript + Vite
Dexie + IndexedDB
Web Speech API
vite-plugin-pwa
Cloudflare Workers Static Assets + Worker API
GitHub card/progress branches
```

The first version deliberately avoids a full account system:

```text
No registration
No normal password
No GitHub OAuth
No user-entered GitHub token
Open app → choose local Profile → review
```

GitHub write credentials are stored only as Cloudflare Secrets. A new device may use a one-time Profile setup link to enable cloud backup; normal daily use only selects the Profile.

## MVP scope

Must have:

1. Local Profile selection and isolation.
2. Public `card` branch synchronization.
3. IndexedDB local storage and offline review.
4. Recognition / Production cards.
5. Unknown / Fuzzy / Known simple SRS.
6. English and Spanish browser TTS.
7. Audio-first listening mode.
8. Local progress persistence.
9. Worker-based progress backup and restore.
10. Progress JSON export/import fallback.
11. Installable PWA and mobile layout.

Not in the first version:

- Native iOS/Android apps.
- Account/password system or GitHub OAuth.
- Multi-device realtime merge.
- Exact background scheduling or push notification.
- Cloze / Output / Contrast activation.
- Cloud TTS, audio-file cache, IPA or pronunciation scoring.
- Cloud database, payment, ads or community decks.

## Current card data

The existing `card` branch is already usable as the MVP content source. The current `manman` manifest contains 130 Notes in 27 listed packs. Pack hashes are currently absent, so the first client will compare `manifest.updated_at` and re-read listed packs when the manifest changes.

## Required reading before development

```text
AGENTS.md
AGENTS.common.md
AGENTS.project.md
docs/design/current-core-design.md
docs/design/web-mvp-framework-design.md
docs/requirements/current-requirements.md
docs/handoff/latest-handoff.md
docs/changes/CHANGELOG-dev.md
```

For GitHub connector operations:

```text
docs/development/chatgpt-github-connector-guide.md
```

## Planned development commands

The application project has not yet been initialized. After initialization, the baseline commands will be:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run test
npm run test:e2e
npm run deploy
```
