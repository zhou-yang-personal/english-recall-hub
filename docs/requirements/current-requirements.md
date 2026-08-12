# English Recall Hub｜Current Requirements

Version: `0.2.0-web-mvp-design`  
Updated: `2026-08-12`

## 1. Product Goal

Build a family-use Web/PWA that turns formal Notes from the GitHub `card` branch into fast daily review on iPhone, Android and desktop browsers.

The first version must optimize for actual use, not platform completeness:

```text
open app
→ choose Profile
→ sync cards
→ review offline
→ listen
→ save progress locally
→ back up and restore progress
```

## 2. User and Scope Assumptions

- Primary users: the owner and a small number of family members.
- UI language in MVP: Chinese.
- Learning languages: English first; Spanish-compatible data and TTS from day one.
- No public registration or commercial multi-tenant service.
- Each Profile has one primary write device in MVP.
- GitHub repository remains the formal content and backup store.

## 3. P0 Functional Requirements

### R1. PWA Access

- The app must run in current Safari, Chrome and Edge on iPhone, Android and desktop.
- The app must be installable to the mobile home screen.
- After a successful first load, the app shell must open offline.

### R2. Local Profile Selection

- The first page shows configured Profiles such as `manman`, `mom`, `kid`.
- Normal daily use requires no password, GitHub login or token input.
- Profile data and progress must be isolated by `profile_id`.
- A Profile without cloud credentials can use local-only mode.

### R3. New-Device Backup Enrollment

- Cloud backup on a new device may be enabled through a one-time Profile setup link or QR.
- The setup link stores a Profile sync key locally and removes it from the visible URL.
- The sync key is not a normal account password and is not requested during later daily use.
- Invalid or missing keys must not block local review.

### R4. Card Manifest Sync

- The app reads `card/profiles/{profile_id}/manifest.json` from the public repository.
- It compares `manifest.updated_at` with local SyncState.
- If unchanged, it does not re-import all packs.
- If changed, it reads every pack listed in the manifest and upserts Notes.
- It reads templates listed in the manifest.
- It validates manifest, templates and Notes before import.
- A failed sync must retain the last successful local dataset.
- The sync result must display success, unchanged, partial failure or failure honestly.

### R5. Existing Card Data Compatibility

The MVP must support the current formal Note fields:

```text
note_id, profile_id, type, core, meaning_cn, explanation_cn,
source_sentence, examples, pronunciation, dedupe_key,
collections, tags, source_draft_ids, status, created_at, updated_at
```

- Missing `learning_lang` is inferred from `pronunciation.lang` or Profile default.
- Missing `native_lang` defaults to `zh-CN`.
- Unknown extra fields are ignored safely.
- Invalid Note rows are skipped and reported; valid rows still import.

### R6. Card Generation

- Cards are generated locally from formal Notes and Templates.
- Card IDs must be stable across sync and devices.
- MVP enables only `recognition` and `production`.
- Unsupported template types such as `cloze`, `output`, `contrast` are ignored without deleting existing progress.
- Recognition shows target-language content first.
- Production shows Chinese meaning first.
- Answers include core, meaning, explanation and examples as applicable.

### R7. Daily Review Queue

- The app queries due ReviewState from IndexedDB.
- Queue priority is overdue learning/relearning, due review, then new cards.
- Daily new-card limit defaults to 10 and is configurable.
- Suspended or archived Notes/Cards do not enter the queue.
- The Home page shows due, learning and new counts.

### R8. Review Interaction

- The user sees the front, recalls, then reveals the answer.
- The answer screen provides `unknown`, `fuzzy`, `known`.
- Each rating updates ReviewState immediately.
- Reloading or closing the browser must not lose the last completed rating.
- A review session shows progress and completion state.

### R9. Simple SRS

Initial schedule:

```text
unknown: 10 minutes
fuzzy: 1 day
known: 3 days
```

Review schedule:

```text
unknown: 10 minutes and lapse_count + 1
fuzzy: max(1 day, interval × 1.5)
known: min(180 days, max(3 days, interval × 2.5))
```

- All scheduling calculations must be covered by unit tests.
- Time calculations use ISO timestamps and the device timezone for display only.

### R10. Pronunciation

- A Note with `pronunciation.text` has a play button.
- Profile settings support English US/UK and Spanish regional preference.
- Speeds are exactly `0.75x`, `1.0x`, `1.25x`.
- Voice selection uses the device voice list with fallback by language.
- Playback errors do not interrupt review.
- `pronunciation.hint_cn` can be displayed after answer reveal.

### R11. Listening Mode

- Listening mode plays pronunciation first and hides the target-language text.
- The user reveals the answer manually.
- Notes without valid pronunciation text are excluded or fall back to normal review.
- Listening mode uses the same ReviewState; it does not create a separate duplicate Card in MVP.

### R12. Offline Use

After one successful content sync:

- Home counts load offline.
- Review works offline.
- TTS uses available system voices where supported.
- Ratings persist offline.
- Backup is marked pending until network returns.

### R13. Progress Backup

- Local progress is always written before cloud backup.
- Backup triggers are: manual action; app open when overdue; review completion when overdue; elapsed configured interval while app is active.
- The default backup interval is 4 hours.
- The Worker validates Profile, sync key, device ID, schema and request size.
- The Worker writes `latest.json` and one daily snapshot.
- It keeps only a bounded number of daily snapshots, default 14.
- Backup failure never rolls back local progress.

### R14. Progress Restore

- A user can check whether a remote backup exists.
- Restore shows backup time, Profile and device before confirmation.
- Restore replaces local ReviewState only for the selected Profile.
- Restore does not overwrite formal Notes/Cards.
- After restore, missing Card IDs are retained as orphan progress or ignored safely until matching Cards return.

### R15. Local Export / Import

- The user can export a Profile progress JSON file.
- The export excludes GitHub token, Worker secrets and Profile sync key.
- Import validates schema and Profile before applying.
- Import asks for confirmation before replacing progress.

### R16. Settings

Per Profile settings:

```text
display name
UI language (zh-CN in MVP)
default learning language
default native language
English accent
Spanish accent
TTS speed
listening mode default
daily new-card limit
backup interval
```

### R17. Status and Error Feedback

The UI must distinguish:

```text
local data ready
syncing
content unchanged
content updated
sync failed, local data retained
backup pending
backup success
backup failed, local progress retained
restore available
```

No operation may report success before confirmation.

## 4. P1 Requirements

Not required for initial acceptance:

- Library page and text search.
- Collection/tag filter.
- Review statistics.
- Selecting older daily snapshots.
- Pack hash incremental sync.
- Cloze/output/contrast cards.
- Multiple primary devices and event-based merge.

## 5. Explicit Non-Goals

- Native iOS/Android build.
- App Store, TestFlight or APK distribution.
- User registration, normal password or password recovery.
- GitHub OAuth or user-entered PAT.
- Public multi-tenant SaaS.
- Exact scheduled background jobs or push notifications.
- Audio-file cache, cloud TTS, IPA or pronunciation scoring.
- D1/KV/R2 or commercial database.
- Payment, ads, marketplace and community decks.

## 6. Non-Functional Requirements

### NFR1. Data Safety

- Sync failure never clears local content.
- Backup failure never clears local progress.
- Imports use transactions where practical.
- Profile isolation is enforced in every repository query.

### NFR2. Performance

At the current 130-Note scale:

- Home should become interactive within 2 seconds on a normal mobile connection after cached app-shell load.
- Local due query should complete within 200 ms.
- A full 27-pack import should complete without freezing the UI; parsing may yield between packs.
- The design must remain usable for tens of thousands of Cards through IndexedDB indexes and paged queries.

### NFR3. Security

- GitHub PAT exists only in Cloudflare Secret.
- Profile sync keys are not committed or logged.
- Worker only accepts configured Profile IDs.
- Request bodies are size-limited.
- Device IDs and paths are sanitized.
- CORS is restricted to the deployed application origin.

### NFR4. Compatibility

Minimum acceptance browsers:

```text
iOS Safari
Android Chrome
desktop Chrome/Edge
```

TTS voice names are not assumed to be identical across platforms.

### NFR5. Maintainability

- Domain scheduling and card generation remain pure TypeScript modules.
- External data is validated with Zod.
- IndexedDB access is isolated in repositories.
- Worker GitHub access is isolated in one service.
- No unnecessary framework abstraction is introduced.

## 7. Acceptance Use Cases

| ID | Use case | Acceptance result |
|---|---|---|
| UC01 | First open | Profile list appears; no login/token screen |
| UC02 | Select Profile | Correct Home counts and settings load |
| UC03 | First card sync | Existing 130 Notes import successfully or invalid rows are reported |
| UC04 | No-change sync | Manifest unchanged; packs are not re-imported |
| UC05 | Sync failure | Last local Notes/Cards remain usable |
| UC06 | Recognition review | Front/answer/rating flow works |
| UC07 | Production review | Chinese prompt and English answer work |
| UC08 | Rating persistence | Refresh does not lose progress |
| UC09 | Due scheduling | Ratings produce expected due times |
| UC10 | Offline review | Review works after network is disabled |
| UC11 | English TTS | en-US/en-GB preference and fallback work |
| UC12 | Spanish TTS | Spanish text plays with a compatible voice |
| UC13 | Listening mode | Text stays hidden until reveal |
| UC14 | Local-only Profile | Review works without cloud setup |
| UC15 | Backup | Latest and daily snapshot are written through Worker |
| UC16 | Backup failure | Local progress remains and pending state is shown |
| UC17 | Restore | Selected Profile ReviewState is restored |
| UC18 | Profile isolation | One Profile never sees another's progress |
| UC19 | Stable Card ID | Note refresh does not reset matching progress |
| UC20 | Export/import | Progress round-trip succeeds with schema validation |
| UC21 | PWA install | Home-screen installation works on target mobile browsers |
| UC22 | Security rejection | Invalid Profile/key/device/payload is rejected |

## 8. Delivery Estimate

For one React/TypeScript developer with AI assistance:

```text
12–13 working days including tests and mobile-browser fixes
8–9 working days if Worker backup/restore is deferred
```

Estimated production code: 4,200–6,500 lines.  
Estimated test code: 1,200–2,000 lines.  
Estimated source/test files: 45–68.

Detailed module and milestone breakdown is maintained in `docs/design/web-mvp-framework-design.md`.
