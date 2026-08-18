# English Recall Hub｜Current Requirements

Version: `0.4.0-m3-content-review`
Updated: `2026-08-18`

## 1. Product Goal

Build a personal/family Web/PWA that turns formal Notes from GitHub into fast daily active recall on iPhone, Android and desktop, works offline after setup, and synchronizes a learner's progress across devices through a lightweight account backend.

Primary journey:

```text
choose/create LearnerProfile without login → sync cards
→ review/listen offline → save locally
→ optionally sign in to synchronize progress across devices
```

## 2. Product Assumptions

- Initial users are the owner and a small number of family members.
- UI is Chinese; learning content is English-first and language-extensible.
- This is not a public multi-tenant SaaS or course platform.
- GitHub `card` is the formal content source.
- IndexedDB is the runtime source; Supabase is the optional cloud account/progress source.
- Cloudflare hosts the static PWA.
- One Supabase project may be shared with other personal apps through the isolated `english_recall` schema.

## 3. P0 Functional Requirements

### R1. PWA and offline shell

- Run in current iOS Safari, Android Chrome and desktop Chrome/Edge.
- Be installable to a mobile home screen.
- Open the cached shell offline after one successful load.

### R2. Local-first access and optional passwordless account

- Allow selecting and creating a local LearnerProfile without authentication or network access.
- Offer email OTP through Supabase Auth only when the user explicitly enables cloud sync.
- Persist the session so normal daily use does not repeatedly request login.
- Allow offline review when a previously authenticated session cannot refresh.
- Never request a GitHub token, Supabase secret key or normal password.

### R3. Learner and content Profiles

- A user can select or create a local LearnerProfile without an Account.
- A LearnerProfile owns settings and progress, references one ContentProfile, and may optionally link to an Account for cloud sync.
- A ContentProfile identifies a GitHub content path such as `manman`; it is not an account.
- Local progress is isolated by LearnerProfile; remote progress is additionally isolated by authenticated user.

### R4. Card manifest sync

- Read `card/profiles/{content_profile_id}/manifest.json` publicly.
- Compare `manifest.updated_at` with local SyncState.
- If changed, fetch every listed template and pack; if unchanged, skip re-import.
- Validate manifest/templates/Notes with Zod.
- Parse the final JSONL record even without a trailing newline.
- Preserve the last successful local dataset if required retrieval/import fails.
- Report requested packs, loaded packs, valid/skipped Notes, generated Cards and warnings.

### R5. Current data compatibility

- Follow manifest values; never hardcode Note or pack counts.
- Accept the existing formal Note fields and ignore unknown extra fields safely.
- Infer missing learning language from pronunciation/Profile and default native language to `zh-CN`.
- Skip invalid Note rows while retaining valid rows.
- Treat null pack hashes honestly; do not claim checksum verification.

### R6. Card generation

- Generate Cards locally from formal Notes/Templates.
- Use lowercase SHA-256 of `note_id|template_id|card_type` as the stable ID.
- Enable only recognition and production.
- Ignore unsupported card types without deleting their historical progress.
- Retain progress when Note text changes but stable identifiers remain.

### R7. Daily review

- Query due ReviewState from IndexedDB for the selected LearnerProfile.
- Prioritize relearning, learning, due review/mature, then new Cards.
- Default the daily new-card limit to 10 and make it configurable.
- Exclude suspended/archived content.
- Show due, learning and new counts on Home.

### R8. Review transaction

- Show prompt, explicit answer reveal, then unknown/fuzzy/known ratings.
- In one Dexie transaction, append a pending ReviewEvent and update ReviewState.
- Advance only after that transaction commits.
- Preserve the last completed rating across refresh/browser close.

### R9. Scheduler v1

Initial:

```text
unknown: 10 minutes
fuzzy: 1 day
known: 3 days
```

Existing:

```text
unknown: 10 minutes; lapse_count + 1
fuzzy: max(1 day, round(interval × 1.5))
known: min(180 days, max(3 days, round(interval × 2.5)))
```

- Mature begins at 90 days.
- The same pure function is used for normal rating and event replay.
- Scheduling and replay are covered by fixed-clock unit tests.

### R10. Progress event synchronization

- A ReviewEvent has a UUID idempotency key, LearnerProfile, Card, rating, device, timestamp and scheduler version.
- Upload pending events in bounded batches with duplicate IDs ignored.
- Pull events incrementally by monotonically increasing server `sync_seq`.
- Upsert events locally and replay affected Cards in `sync_seq` order.
- Store the sync cursor only after local event/state updates commit.
- When cloud sync is enabled, trigger it on app open, reconnect, review completion, manual action and active-use debounce.
- Never delete pending events after a failed push.

### R11. New-device reconstruction

- After the user enables cloud sync with the same account on a new device, load its cloud-linked LearnerProfiles.
- Download content and paged ReviewEvents.
- Rebuild ReviewState locally before showing synchronized completion.
- Concurrent events from two devices must converge, not overwrite each other.

### R12. Pronunciation and listening

- Play `pronunciation.text` through Web Speech API.
- Support en-US/en-GB and es-MX/es-US/es-ES preferences.
- Support exactly 0.75x, 1.0x and 1.25x.
- Fall back from exact locale to language prefix and then system default.
- Listening mode hides target text until reveal and uses the same Card/ReviewState.
- Playback failure must not block review.

### R13. Settings and status

- Store display name, language, voice, speed, listening default and daily new limit per LearnerProfile.
- Distinguish content sync from progress sync.
- Show: local ready, local changes pending, syncing, synchronized, content unchanged/updated, and content/progress failure with local data retained.
- Never report success before confirmed persistence.

### R14. Export/import and sign-out safety

- Export/import a selected LearnerProfile's progress as validated JSON.
- Exclude auth tokens, publishable/secret keys and platform credentials.
- Ask before replacing local progress on import.
- Ask separately before clearing local learner data on sign-out.

## 4. P1 — Only After MVP Acceptance

- Library/search and collection/tag filters.
- Review statistics.
- Additional card types after source schema support.
- Remote materialized checkpoints if event replay becomes measurably slow.
- Supabase Realtime if users need open-device instant updates.
- Family invitations, shared ownership and roles.
- GitHub `progress` cold backup automation.

## 5. Explicit Non-goals

- Native mobile packages or stores.
- Normal passwords, social login or public registration workflow.
- Manual conflict resolution or collaborative simultaneous sessions.
- Custom account backend, Cloudflare progress API, D1/KV/R2.
- Exact background scheduling or push notifications.
- Cloud TTS, audio cache, IPA or pronunciation scoring.
- Payment, advertisements, community decks or analytics platform.

## 6. Non-functional Requirements

### NFR1. Data safety

- Local rating commits before UI advancement or cloud activity.
- Content failure never clears valid local content.
- Progress failure never clears pending events/local state.
- Imports and sync cursor advancement use transactions.

### NFR2. Security

- Every exposed Supabase table has explicit grants and RLS.
- Unauthenticated clients can use IndexedDB but cannot read/write Supabase Profiles or ReviewEvents.
- One authenticated user cannot access another user's rows.
- Frontend contains only Supabase URL/publishable key and public content URL.
- Secret/service-role keys, database passwords and PATs are never committed or logged.

### NFR3. Performance

- Home becomes interactive from cached shell/local DB within 2 seconds on a normal device.
- Local due query completes within 200 ms at current scale.
- Current manifest import does not freeze the UI.
- Event upload/download is paged and bounded.
- The design supports at least tens of thousands of Cards and hundreds of thousands of ReviewEvents before adding checkpoints.

### NFR4. Maintainability

- Domain scheduling/generation/replay are pure TypeScript.
- External boundaries use Zod and small ports/adapters.
- Feature folders own their use cases and UI.
- No DI container, global state library, custom backend framework or speculative abstraction.

## 7. Acceptance Use Cases

| ID | Use case | Acceptance result |
|---|---|---|
| UC01 | First open | User creates/selects a local LearnerProfile without login |
| UC02 | Daily open | Selected LearnerProfile reaches local Home without login |
| UC03 | Optional cloud connection | Email OTP creates a persisted cloud-sync session |
| UC04 | First content sync | Current manifest-listed data imports with honest warnings |
| UC05 | No-change content sync | Packs are not re-imported |
| UC06 | Content failure | Last local Cards remain usable |
| UC07 | Recognition/production | Both prompt/reveal/rating flows work |
| UC08 | Atomic rating | Refresh retains the committed rating/event |
| UC09 | Scheduler | Rating matrix produces expected due times |
| UC10 | Offline review | Ratings persist and remain pending offline |
| UC11 | Reconnect | Pending events upload and progress becomes synchronized |
| UC12 | Idempotent retry | Retried event creates one remote record |
| UC13 | New device | Same account reconstructs matching ReviewState |
| UC14 | Concurrent devices | Interleaved events converge on both devices |
| UC15 | User isolation | RLS blocks cross-user reads/writes |
| UC16 | English/Spanish TTS | Locale preference/fallback works |
| UC17 | Listening mode | Target text remains hidden until reveal |
| UC18 | Export/import | Progress round-trip succeeds without secrets |
| UC19 | Sign-out | Session clears without silently deleting local progress |
| UC20 | PWA install | Home-screen install works on target mobile browsers |

## 8. Delivery Estimate

```text
Full Web MVP with account progress sync: 13–15 working days
Production source estimate: 4,500–6,500 LOC
Test estimate: 1,500–2,300 LOC
```

These ranges guide sequencing; they are not targets to inflate implementation.
