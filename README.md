# English Recall Hub

English Recall Hub 是一个面向个人和家庭的多语言主动回忆工具。它把 ChatGPT 中学到的单词、短语、句子、语法和表达沉淀为正式 Note/Card，并通过 Web/PWA 完成离线复习、朗读和账号进度同步。

## Current baseline

- Version: `0.3.3-m2-local-first-profiles`
- Default branch: `main`
- Source-of-truth development branch: `dev`
- Data branches: `draft`, `card`, `progress`
- First platform: Web/PWA on iPhone, Android and desktop
- Status: M2 local-first learner flow and optional account foundation implemented; content and ReviewEvent synchronization remain subsequent milestones
- Production URL: `https://english-recall-hub.zhou-yang-personal.workers.dev`

## Product flow

```text
ChatGPT Project → draft DraftNote → Builder validation/dedupe
→ card formal Notes/Templates → Web/PWA IndexedDB
→ recognition/production review → local ReviewEvents
→ optional Supabase account progress synchronization
```

## MVP architecture

```text
React + TypeScript + Vite + React Router
Dexie / IndexedDB + Zod
Web Speech API + vite-plugin-pwa
Supabase Auth (email OTP) + Postgres + RLS
Cloudflare Workers Static Assets
GitHub public `card` content
```

Core boundaries:

- IndexedDB is the runtime source; review works offline after setup.
- GitHub `card` is Builder-owned content and is read publicly.
- IndexedDB stores local LearnerProfiles; Supabase optionally stores cloud-linked LearnerProfiles and append-only ReviewEvents.
- ReviewEvents synchronize incrementally; ReviewState is rebuilt locally.
- Cloudflare serves the PWA; no custom progress Worker API is required in MVP.
- Frontend contains no GitHub PAT, Supabase secret/service-role key or database password.

## MVP scope

Must have:

1. LearnerProfile selection/creation without login.
2. Optional email OTP account and persisted cloud-sync session.
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
- Cloudflare progress API, D1/KV/R2 or a custom backend framework.
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

Copy `.env.example` to `.env.local` and provide only the public Supabase URL/publishable key and card repository URL. The linked Supabase project now has the `english_recall` schema, explicit grants and RLS; no privileged browser credential is required.

The Supabase local stack and pgTAP database tests require Docker or another compatible container runtime.
