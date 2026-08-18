# English Recall Hub

English Recall Hub 是一个面向个人和家庭的多语言主动回忆工具。它把 ChatGPT 中学到的单词、短语、句子、语法和表达沉淀为正式 Note/Card，并通过 Web/PWA 完成离线复习、朗读和账号进度同步。

## Current baseline

- Version: `0.5.0-m4-family-sync`
- Default branch: `main`
- Source-of-truth development branch: `dev`
- Data branches: `draft`, `card`, `progress`
- First platform: Web/PWA on iPhone, Android and desktop
- Status: M4 family-device pairing, Worker progress API and incremental ReviewEvent synchronization are implemented; TTS/listening remain subsequent milestones
- Production URL: `https://english-recall-hub.zhou-yang-personal.workers.dev`

## Product flow

```text
ChatGPT Project → draft DraftNote → Builder validation/dedupe
→ card formal Notes/Templates → Web/PWA IndexedDB
→ recognition/production review → local ReviewEvents
→ paired-family progress synchronization
```

## MVP architecture

```text
React + TypeScript + Vite + React Router
Dexie / IndexedDB + Zod
Web Speech API + vite-plugin-pwa
Supabase Postgres + RLS
Cloudflare Worker API + Static Assets
GitHub public `card` content
```

Core boundaries:

- IndexedDB is the runtime source; review works offline after setup.
- GitHub `card` is Builder-owned content and is read publicly.
- IndexedDB stores local LearnerProfiles; Supabase stores family-linked LearnerProfiles and append-only ReviewEvents.
- ReviewEvents synchronize incrementally; ReviewState is rebuilt locally.
- Cloudflare serves the PWA and a minimal same-origin progress API.
- A new device enters one family pairing code once; normal use then opens directly to learner selection.
- Supabase secret/service-role key is a Worker Secret and never enters frontend JavaScript, Git or logs.

## MVP scope

Must have:

1. LearnerProfile selection/creation without login.
2. One-time family-device pairing with a long-lived signed HttpOnly Cookie; no email login UI.
3. Current manifest/pack/template import without hardcoded counts.
4. IndexedDB/offline recognition and production review.
5. Unknown/fuzzy/known scheduler v1.
6. Idempotent ReviewEvent synchronization and new-device reconstruction.
7. English/Spanish browser TTS and listening mode.
8. Progress JSON export/import.
9. Installable mobile-first PWA.

Not in MVP:

- Native apps, normal passwords, social login or public SaaS.
- Family invitation/role/admin system or real-time collaboration.
- D1/KV/R2 or a general backend/admin framework.
- Advanced card types, cloud TTS, pronunciation scoring or push notifications.
- Payment, ads, analytics platform or community decks.

## Current card data

The `card` branch is already usable. On `2026-08-17`, the `manman` manifest listed 137 Notes in 27 packs and all pack hashes were null. These numbers are observations, not client constants; the client follows `manifest.updated_at` and listed paths.

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

## Development commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run test
npx supabase start
npx supabase test db
npm run deploy
```

Copy `.env.example` to `.env.local` for the public card repository URL. The browser calls same-origin `/api`; Supabase URL, secret key, family owner UUID, pairing code and device-session signing secret are configured only as Cloudflare Worker Secrets.

The Supabase local stack and pgTAP database tests require Docker or another compatible container runtime.
