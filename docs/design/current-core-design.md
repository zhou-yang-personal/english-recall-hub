# English Recall Hub｜Current Core Design

Version: `0.3.1-m1-foundation`
Updated: `2026-08-17`
Branch: `dev`

## 1. Product Positioning

English Recall Hub is a personal/family multilingual active-recall tool. It turns learning captured in ChatGPT into reliable Cards, supports fast offline review, and keeps a learner's progress synchronized across their devices.

It is not a dictionary, course platform, public SaaS or general account system.

```text
ChatGPT → DraftNote → Builder → formal Note/Card source
→ Web/PWA local review → ReviewEvents → account progress sync
```

## 2. MVP Architecture

```text
Frontend/runtime
  React + TypeScript + Vite + React Router
  Dexie/IndexedDB
  Web Speech API
  vite-plugin-pwa

Account/progress
  Supabase Auth email OTP
  Supabase Postgres schema `english_recall`
  Row Level Security

Content/deployment
  GitHub `card` public content
  Cloudflare Workers Static Assets
```

The browser accesses Supabase with a publishable key and authenticated user JWT. There is no custom Cloudflare progress API in MVP and no privileged key in frontend JavaScript.

## 3. Data Ownership

```text
draft branch       raw DraftNote inbox
card branch        Builder-owned manifest, packs and templates
IndexedDB          runtime Notes, Cards, events and materialized state
Supabase           Account, LearnerProfile and synchronized ReviewEvents
progress branch    reserved; not an MVP runtime database
```

ChatGPT writes DraftNote only. Builder owns formal content. The PWA reads `card` and never writes formal packs.

## 4. Identity Model

The previous design conflated three responsibilities. They are now explicit:

```text
Account          authenticated Supabase user
LearnerProfile   progress/settings identity owned by Account
ContentProfile   GitHub card path such as `manman`
```

A LearnerProfile references one ContentProfile. ReviewState uses `learner_profile_id`; Note/Card content uses `content_profile_id`.

## 5. Runtime Flows

### 5.1 Sign-in and startup

```text
email OTP once → persisted session → choose LearnerProfile
→ render Home from IndexedDB → background progress/content sync
```

An expired session or cloud outage does not block already-initialized offline review. Synchronization resumes after reauthentication/connectivity.

### 5.2 Content sync

```text
manifest.updated_at changed
→ fetch listed templates/packs
→ validate rows
→ generate recognition/production Cards
→ transactionally replace active local content
```

Current observed data is 137 Notes in 27 packs with null hashes. Counts are not hardcoded. Missing trailing JSONL newline is supported. A failed import retains the previous local dataset.

### 5.3 Rating and progress sync

```text
rating
→ one Dexie transaction writes pending ReviewEvent + ReviewState
→ UI advances
→ later upload event idempotently
→ pull remote events by sync_seq
→ replay affected ReviewStates
```

ReviewEvent is the synchronized fact; ReviewState is a local materialized view. This allows multiple devices to converge without replacing entire snapshots.

## 6. Core Domain

```text
DraftNote → Note → Card
LearnerProfile + Card → ReviewEvent → ReviewState
```

Stable Card ID:

```text
lowercase_hex_sha256(note_id + "|" + template_id + "|" + card_type)
```

MVP card types:

```text
recognition
production
```

Unsupported cloze/output/contrast templates are ignored safely because the current Note schema does not satisfy them.

## 7. Scheduler v1

```text
new unknown → 10 minutes
new fuzzy   → 1 day
new known   → 3 days

existing unknown → 10 minutes; lapse + 1
existing fuzzy   → max(1, round(interval × 1.5)) days
existing known   → min(180, max(3, round(interval × 2.5))) days
```

Mature begins at 90 days. The scheduler is a pure function shared by live rating and event replay.

## 8. Offline, TTS and PWA

- Service worker caches the app shell/assets.
- IndexedDB holds business data.
- After first successful content sync, Home/Review work offline.
- Web Speech supports English and Spanish locale fallback at 0.75/1.0/1.25 speed.
- Listening mode hides target text until reveal and reuses normal progress.
- No audio-file cache, cloud TTS, IPA or pronunciation scoring.

## 9. Security Boundaries

- RLS is enabled on every exposed Supabase table.
- Account rows are isolated with `auth.uid()`.
- Frontend includes only Supabase URL/publishable key and public card URL.
- Supabase secret/service-role key, database password, GitHub PAT and Cloudflare token never enter frontend/Git/logs.
- Failed content sync never clears content.
- Failed progress sync never clears pending events/state.
- Exported progress never includes credentials.

## 10. Code Design

Use feature-first modules with lightweight Ports and Adapters:

```text
React UI → feature use case → pure domain
feature use case → small port → Dexie/GitHub/Supabase/Web Speech adapter
```

Ports exist only at real external boundaries. No DI container, Redux/Zustand, custom backend framework or speculative shared layer is allowed in MVP.

The implementation-level 4+1 views, schemas, algorithms, traceability and milestones are defined in:

```text
docs/design/web-mvp-framework-design.md
```

## 11. MVP Exclusions

- Native applications and app stores.
- Normal passwords/social login/public SaaS.
- Family invitations/roles/admin site.
- Real-time collaborative review or manual conflict UI.
- Cloudflare progress API/D1/KV/R2.
- Advanced card types, cloud TTS and push notifications.
- Payment, ads, analytics platform and community marketplace.
