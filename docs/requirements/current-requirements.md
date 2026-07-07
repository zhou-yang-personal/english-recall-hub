# English Recall Hub｜Current Requirements

Version: `0.1.0-docs-baseline`
Updated: `2026-07-07`

## 1. Product Goal

Build a local-first mobile English recall app for personal/family use. The app synchronizes validated learning content from GitHub and uses local SQLite for fast review, pronunciation playback and progress tracking.

## 2. MVP Functional Requirements

### R1. Profiles

- Support multiple local learning profiles.
- Each profile has display name, optional PIN, study settings and GitHub sync paths.
- Different profiles can map to different ChatGPT Projects and GitHub paths.

### R2. GitHub Data Branches

- `draft`: raw DraftNote input.
- `card`: formal Note packs, templates, collections and manifest.
- `progress`: recent progress backup snapshots.

### R3. DraftNote Intake

- ChatGPT Project writes DraftNote JSONL into profile-specific draft inbox.
- If ChatGPT GitHub write fails, the user can copy DraftNote into the app import/outbox.
- DraftNotes are not directly reviewed by the app.

### R4. Builder Pipeline

- Validate DraftNote schema.
- Check dedupe_key.
- Reject low-quality drafts.
- Merge duplicated knowledge points.
- Publish normalized Notes into card branch.
- Update manifest.
- Record processed/rejected/merged ledger.

### R5. Card Sync

- App reads profile manifest from card branch.
- App downloads changed packs only.
- App verifies pack hash.
- App imports Notes into local SQLite.
- App generates Cards from Templates locally.

### R6. Review

- Support daily due review.
- Support new card introduction limit.
- Support feedback: `unknown`, `fuzzy`, `known`.
- Store review state and review events locally.
- Default study scope is all active cards.
- Optional scope by collection/tag/status.

### R7. Pronunciation MVP

- Each Note can include `pronunciation.text`, `pronunciation.lang`, optional `pronunciation.hint_cn`.
- App supports one-tap TTS playback for words, phrases and sentences.
- App supports US/UK accent preference.
- App supports 0.75x, 1.0x and 1.25x playback speed.
- App caches generated audio locally.
- App supports listening review mode: audio-first, text hidden until answer reveal.

### R8. Progress Backup

- Review progress is written locally first.
- App supports manual progress sync.
- App attempts backup when opened if backup is overdue.
- App supports daily scheduled backup attempt where mobile OS permits.
- Progress branch keeps recent snapshots only.
- First version assumes one primary write device per profile.

## 3. Non-Functional Requirements

- Local-first: app must work offline after initial sync.
- GitHub is not used as a realtime database.
- App startup must not scan all GitHub files; it must use manifest.
- Sealed packs are immutable.
- Large binary files, audio cache, SQLite DB and device logs are never committed.
- Sync failures must be visible and recoverable.
- No false success status for backup or sync.

## 4. MVP Exclusions

The first version explicitly excludes:

- SaaS backend account system.
- Public marketplace or community deck.
- Full family permission system.
- Pronunciation scoring.
- Cloud TTS.
- Audio branch.
- Multi-device automatic conflict merge.
- Payment, analytics, ads or commercial backend.

## 5. Initial Open Decisions

- Final mobile framework: React Native / Expo is the current recommendation but not yet confirmed by implementation.
- Builder implementation location: GitHub Action, local script, or app-assisted builder is not yet finalized.
- SRS algorithm: MVP can start with a simple interval table; FSRS/SM-2 can be evaluated later.
- GitHub auth: MVP may start with fine-grained token; OAuth can be evaluated later.
