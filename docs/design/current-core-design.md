# English Recall Hub｜Current Core Design

Version: `0.1.0-docs-baseline`
Updated: `2026-07-07`
Branch: `dev`

## 1. Product Positioning

English Recall Hub is a GitHub-backed, local-first mobile English recall app. It turns ChatGPT English-learning notes into durable, reviewable knowledge units and supports personal/family profiles.

It is not a generic dictionary, course app, or simple vocabulary notebook. Its value is the closed loop:

```text
ChatGPT learning question
→ DraftNote
→ validated Note
→ generated Card
→ mobile SRS review
→ local progress
→ recent progress backup
```

## 2. Branch Model

```text
main       stable repository documentation
dev        app source code and project documents
draft      raw DraftNote inbox from ChatGPT Projects / app import
card       validated formal Note packs and templates
progress   recent profile/device progress backups
```

Branch responsibilities:

- `dev`: code, design, requirements, governance docs.
- `draft`: append-only draft input. It can contain duplicate or imperfect AI-generated drafts.
- `card`: formal content library. App reads this branch.
- `progress`: recent backup snapshots. App writes this branch at low frequency.

## 3. Data Flow

```text
ChatGPT Project
  ↓
DraftNote in draft branch
  ↓
Builder job
  - schema validation
  - dedupe_key check
  - quality filtering
  - collection/tag enrichment
  - Note normalization
  - pack publishing
  ↓
Formal Notes in card branch
  ↓
Mobile App sync
  - read manifest
  - download changed packs
  - import SQLite
  - generate Cards from Templates
  ↓
SRS review in local SQLite
  ↓
Progress backup to progress branch
```

Important boundary:

- Draft Builder publishes formal Notes, not next-day review queues.
- The App decides review queues locally by SRS, daily limits, study scope and user progress.

## 4. Core Concepts

### 4.1 DraftNote

DraftNote is the direct output from ChatGPT or app import. It is allowed to be incomplete or duplicated.

Minimum draft fields:

```json
{
  "draft_id": "draft_20260707_001",
  "profile_id": "manman",
  "source_project": "英文学习",
  "source_question": "be concerned with 是什么意思",
  "note_type": "phrase",
  "core": "be concerned with",
  "meaning_cn": "与……有关；关注的是……",
  "source_sentence": "people who have been concerned with matters of consequence",
  "dedupe_key": "phrase:be_concerned_with",
  "collections": ["book:little-prince"],
  "tags": ["phrase", "novel"],
  "candidate_cards": ["recognition", "production", "cloze"]
}
```

### 4.2 Note

One Note is one knowledge point. It is not one review question.

Example:

```json
{
  "note_id": "note_phrase_be_concerned_with_v1",
  "profile_id": "manman",
  "type": "phrase",
  "core": "be concerned with",
  "meaning_cn": "与……有关；关注的是……",
  "source_sentence": "people who have been concerned with matters of consequence",
  "examples": [
    {
      "en": "This analysis is mainly concerned with fiber user growth.",
      "cn": "这个分析主要关注光纤用户增长。"
    }
  ],
  "pronunciation": {
    "text": "be concerned with",
    "lang": "en",
    "hint_cn": "concerned 重音在第二音节；with 可弱读。"
  },
  "dedupe_key": "phrase:be_concerned_with",
  "collections": ["book:little-prince"],
  "tags": ["phrase", "novel", "business-transfer"],
  "status": "active"
}
```

### 4.3 Card

Cards are concrete review prompts generated from Notes through Templates.

One Note can generate multiple Cards:

| Card type | Goal |
|---|---|
| recognition | English → Chinese understanding |
| production | Chinese → English active recall |
| cloze | phrase / grammar pattern completion |
| contrast | confusing expression comparison |
| output | sentence creation / usage |

Card ID must be stable:

```text
card_id = hash(note_id + template_id + card_type)
```

### 4.4 Template

Template defines how a Note produces Cards. It is a rule, not visual styling.

Example:

```json
{
  "template_id": "phrase.v1",
  "note_type": "phrase",
  "cards": [
    {
      "card_type": "recognition",
      "front": "{{core}} 是什么意思？",
      "back": "{{meaning_cn}}"
    },
    {
      "card_type": "production",
      "front": "“{{meaning_cn_short}}”用英文怎么说？",
      "back": "{{core}}"
    },
    {
      "card_type": "cloze",
      "front": "{{cloze_sentence}}",
      "back": "{{core}}"
    }
  ]
}
```

### 4.5 Pack

Pack is a physical storage shard, not a learning category.

Recommended rule:

```text
Seal one pack every 5,000 Notes or when raw size exceeds about 5MB.
Sealed packs are not modified.
Recent additions go into notes_current.jsonl.
```

Example card branch layout:

```text
profiles/manman/
  manifest.json
  packs/
    notes_000001_005000.jsonl.gz
    notes_current.jsonl
  templates/
    word.v1.json
    phrase.v1.json
    sentence.v1.json
    grammar.v1.json
  collections.json
```

### 4.6 Collection and Tag

Collection/tag controls learning scope.

Examples:

```text
collection: book:to-all-the-boys-i-loved-before
collection: scenario:business-email
collection: scenario:ppt-speaking

tag: word
tag: phrase
tag: grammar
tag: novel
tag: business-transfer
```

Default study mode learns all active cards. Users can optionally include/exclude collections or tags.

## 5. Pronunciation MVP

MVP only supports:

1. Note pronunciation metadata.
2. One-tap word / phrase / sentence TTS playback.
3. US / UK accent preference.
4. 0.75x / 1.0x / 1.25x speed.
5. Local audio cache.
6. Audio-first listening review mode.

Data rule:

```json
{
  "pronunciation": {
    "text": "jaw",
    "lang": "en",
    "hint_cn": "optional Chinese pronunciation tip"
  }
}
```

Do not store accent, speed, cache policy or audio path in every Note. Those belong to profile settings and local cache.

## 6. Local SQLite Role

The mobile app local SQLite database is the runtime source of truth for review.

Core tables:

```text
profiles
profile_settings
notes
cards
review_state
review_events
audio_cache
sync_state
backup_state
```

GitHub card/progress branches are sync and recovery sources, not runtime databases.

## 7. Progress Backup

Progress backup is low-frequency and snapshot-based.

Recommended triggers:

- App open: check if backup is overdue.
- Review completion: mark backup dirty if enough events accumulated.
- Daily scheduled attempt.
- Manual sync button.

Progress branch layout:

```text
profiles/manman/devices/iphone_001/
  latest.json
  snapshots/2026/07/progress_2026-07-07_2230.json.gz
  events/2026/07/events_2026-07-07.jsonl.gz
```

Retention:

```text
Last 7 days: keep frequent event backups.
Last 30 days: keep daily latest snapshots.
Older than 30 days: keep month-end snapshots only.
```

## 8. MVP Scope

Must have:

- Multi-profile local accounts.
- GitHub config per profile.
- Card manifest sync.
- Note import into SQLite.
- Template-based Card generation.
- SRS review with `unknown / fuzzy / known` feedback.
- Pronunciation MVP.
- Manual and low-frequency progress backup.

Explicitly not in MVP:

- SaaS account system.
- Full family permission management.
- Pronunciation scoring.
- Cloud TTS audio generation.
- Audio branch.
- Multi-device complex progress merge.
- Commercial public service backend.
