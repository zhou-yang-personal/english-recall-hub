# English Recall Hub｜Current Core Design

Version: `0.6.0-m4-github-profiles`
Updated: `2026-08-18`
Branch: `dev`

## 1. Product Positioning

English Recall Hub is a personal/family multilingual active-recall tool. It turns learning captured in ChatGPT into reliable Cards, supports fast offline review, and keeps a learner's progress synchronized across their devices.

It is not a dictionary, course platform, public SaaS or general account system.

```text
ChatGPT → DraftNote → Builder → formal Note/Card source
→ Web/PWA local review → ReviewEvents → paired-family progress sync
```

## 2. MVP Architecture

```text
Frontend/runtime
  React + TypeScript + Vite + React Router
  Dexie/IndexedDB
  Web Speech API
  vite-plugin-pwa

Family cloud progress
  Cloudflare Worker `/api` + signed device Cookie
  Supabase Postgres schema `english_recall`
  server-only secret key + Row Level Security defense-in-depth

Content/deployment
  GitHub `card` public content
  Cloudflare Workers Static Assets
```

The browser never accesses progress tables directly. A new device submits the family pairing code once to the same-origin Worker; the Worker issues a signed, one-year, HttpOnly/Secure/SameSite Cookie. The Worker stores the Supabase secret key and family owner UUID as Secrets and enforces that owner boundary on every profile/event request.

## 3. Data Ownership

```text
draft branch       raw DraftNote inbox
card branch        Builder-owned manifest, packs and templates
IndexedDB          runtime Notes, Cards, events and materialized state
Supabase           family-owned LearnerProfile and synchronized ReviewEvents
progress branch    reserved; not an MVP runtime database
```

ChatGPT writes DraftNote only. Builder owns formal content. The PWA reads `card` and never writes formal packs.

## 4. Identity Model

The previous design conflated three responsibilities. They are now explicit:

```text
FamilySpace      server-configured cloud ownership boundary
DeviceGrant      signed Worker Cookie created by one-time pairing
LearnerProfile   internal local-first progress/settings identity; may link to FamilySpace
ContentProfile   visible learner and GitHub card path such as `manman`
```

A LearnerProfile references one ContentProfile. ReviewState uses `learner_profile_id`; Note/Card content and the visible selection use `content_profile_id`.

The frontend lists public directories under GitHub `card/profiles/*` and does not expose LearnerProfile creation. Selecting a ContentProfile automatically reuses or creates one progress identity. Family creation is idempotent by ContentProfile and returns the oldest existing identity. Historical duplicate rows are hidden from the choice list but are never deleted automatically.

## 5. Runtime Flows

### 5.1 Local-first startup

```text
new device optionally enters family code once → signed device Cookie
→ read/choose GitHub ContentProfile → automatically prepare progress identity → render Home from IndexedDB
→ linked learners synchronize progress through Worker in the background
```

No email/account login appears in the frontend. An unpaired device can remain local-only. An expired device grant or cloud outage only pauses cloud synchronization; local review remains available and pending events retry after pairing/connectivity recovers.

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
- Local-only LearnerProfiles never require cloud access; paired API requests are limited to the configured family owner UUID.
- Frontend includes only the public card URL and same-origin API path.
- Supabase remains protected from anonymous browser access by grants/RLS; the trusted Worker bypasses RLS and therefore repeats ownership validation in application code.
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
- D1/KV/R2, family invitation/role management or a general backend framework.
- Advanced card types, cloud TTS and push notifications.
- Payment, ads, analytics platform and community marketplace.
