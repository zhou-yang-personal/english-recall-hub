# English Recall Hub｜External Entry Settings

Version: `0.2.0-web-mvp-design`  
Updated: `2026-08-12`

This document records configuration outside the repository.

## 1. English-learning ChatGPT Project

The English-learning Project remains responsible for teaching first and writing review-worthy DraftNotes to:

```text
REPO=zhou-yang-personal/english-recall-hub
PROFILE_ID=manman
DRAFT_BRANCH=draft
DRAFT_PATH=profiles/manman/inbox
CARD_BRANCH=card
CARD_PATH=profiles/manman
PROGRESS_BRANCH=progress
PROGRESS_PATH=profiles/manman
```

Hard rules:

```text
ChatGPT writes DraftNote only.
Do not bypass Builder.
One DraftNote = one knowledge point.
pronunciation only uses text/lang/hint_cn.
Do not write card/progress/dev unless explicitly doing repository work.
```

These rules are unchanged by the Web/PWA architecture decision.

## 2. Single Project Source File

The external ChatGPT Project should use only this source file:

```text
docs/development/English-Recall-Hub-Project-Source.txt
```

The `0.2.0` source file replaces the earlier version that referred to a mobile App and SQLite. It now states:

```text
Web/PWA runtime
Dexie/IndexedDB
Web Speech API
Cloudflare Worker progress backup
no normal login/password/token input
```

## 3. Development Session Opener

```text
你现在接手 English Recall Hub 项目。请先读取仓库根目录 AGENTS.md，并继续读取其中列出的 AGENTS.common.md、AGENTS.project.md、README.md、docs/design/current-core-design.md、docs/design/web-mvp-framework-design.md、docs/requirements/current-requirements.md、docs/handoff/latest-handoff.md 和 docs/changes/CHANGELOG-dev.md。如涉及 GitHub connector 操作，还必须读取 docs/development/chatgpt-github-connector-guide.md。当前 source-of-truth 分支是 dev；第一版技术基线是 React + TypeScript + Vite + Dexie/IndexedDB + Web Speech API + Cloudflare Workers Static Assets/Worker API。不要回到 React Native/Expo 或 SQLite 原生 App 基线。
```

## 4. Codex / Development Agent Entry

```text
Repository: zhou-yang-personal/english-recall-hub
Source-of-truth branch: dev
Before any design or code change, read AGENTS.md and every required file listed inside it.
Follow docs/design/web-mvp-framework-design.md as the implementation baseline.
The MVP is Web/PWA: React + TypeScript + Vite + Dexie/IndexedDB + Web Speech API + Cloudflare Worker.
Do not implement native mobile builds, normal account/password, GitHub OAuth, browser PAT input, cloud TTS, pronunciation scoring, multi-device realtime merge, or cloud database unless explicitly requested.
Do not commit GitHub tokens, Cloudflare Secrets, Profile sync keys, IndexedDB exports, progress snapshots, logs, build artifacts or generated packages.
```

## 5. Repository and Deployment Settings

- Keep `main` as stable default branch.
- Keep `dev` as the development source of truth.
- Keep `draft`, `card`, `progress` separated.
- Formal `card` content remains Builder-owned.
- Cloudflare Worker stores GitHub write credentials as Secrets.
- The browser never receives GitHub PAT.
- Normal use opens the PWA and selects a Profile.
- New-device backup enrollment uses a one-time Profile setup link/QR.

## 6. External Configuration Not Stored in Git

Configure in Cloudflare only:

```text
GITHUB_PROGRESS_TOKEN
PROFILE_SYNC_KEYS
ALLOWED_ORIGINS
MAX_BACKUP_BODY_BYTES
SNAPSHOT_RETENTION_DAYS
```

Never paste actual values into Project Instructions, Project Sources, repository files or chat output.
