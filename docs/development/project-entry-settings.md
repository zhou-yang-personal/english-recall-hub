# English Recall Hub｜External Entry Settings

Version: `0.3.2-m2-account-foundation`
Updated: `2026-08-18`

This document records configuration outside the repository.

## 1. English-learning ChatGPT Project

The English-learning Project teaches first and writes review-worthy DraftNotes only to:

```text
REPO=zhou-yang-personal/english-recall-hub
PROFILE_ID=manman
DRAFT_BRANCH=draft
DRAFT_PATH=profiles/manman/inbox
CARD_BRANCH=card
CARD_PATH=profiles/manman
```

It never bypasses Builder or writes runtime account/progress data.

## 2. Single Project Source

Use only:

```text
docs/development/English-Recall-Hub-Project-Source.txt
```

The `0.3.2` source states Web/PWA + IndexedDB + Supabase account/event sync and records the implemented M2 account foundation.

## 3. Development Session Opener

```text
你现在接手 English Recall Hub 项目。请先读取仓库根目录 AGENTS.md 及其列出的全部必读文件。当前 source-of-truth 分支是 dev；第一版基线是 React + TypeScript + Vite + Dexie/IndexedDB + Web Speech API + Supabase Auth/Postgres/RLS + Cloudflare Workers Static Assets。实现遵循 docs/design/web-mvp-framework-design.md 的 4+1 视图、feature-first Ports and Adapters、ReviewEvent 增量同步和范围边界。不要恢复旧的 Profile sync key、Cloudflare progress API 或 GitHub progress snapshot 主链路。
```

## 4. Repository and Platform Settings

- `main` remains stable default; `dev` remains development source of truth.
- `draft`, `card`, `progress` stay separated; `progress` is not an MVP runtime database.
- Formal `card` content remains Builder-owned and publicly read by the PWA.
- Cloudflare serves static PWA assets.
- A shared Supabase project exposes the isolated `english_recall` schema.
- Supabase Auth uses email OTP; Postgres tables use explicit grants and RLS.
- Frontend uses only Supabase URL/publishable key and public card URL.

## 5. External Configuration Not Stored in Git

Frontend-safe build configuration:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_CARD_REPOSITORY_BASE_URL
```

Never place these privileged values in Git, Project Instructions, Project Sources or chat output:

```text
Supabase access token
Supabase secret/service-role key
database password
Cloudflare API token
GitHub PAT
personal credentials
```

Account creation, email verification, CAPTCHA, 2FA and payment confirmation remain user-owned actions. After the user completes CLI login, development agents may apply reviewed migrations/configuration and deploy within the authorized project.

## 6. Current Hosted State

Observed/configured on `2026-08-18`:

- Supabase project is linked to the repository CLI project.
- Migration `20260818020000_create_account_progress.sql` is applied.
- Data API exposes `english_recall`; anonymous reads and writes are denied.
- Cloudflare production URL is `https://english-recall-hub.zhou-yang-personal.workers.dev` with preview hosts matching `*-english-recall-hub.zhou-yang-personal.workers.dev`.
- Hosted Auth Site URL and redirect allow-list are synchronized from `supabase/config.toml`; hosted URL-only changes use a targeted Management API update so unrelated Auth settings remain unchanged.
- The local numeric OTP template contains `{{ .Token }}`. On the hosted free project, Supabase rejected template modification while using its default email provider; hosted login therefore uses the default one-time Magic Link until custom SMTP or a paid plan is configured.
- Cloudflare Git integration is configured. Preview deployment is verified; the fixed production domain remains inactive until the configured production branch deploys.
