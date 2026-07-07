# English Recall Hub

A GitHub-backed English recall app that turns ChatGPT English-learning notes into spaced-repetition cards, local mobile review data, and recoverable progress snapshots.

## Current baseline

- Version: `0.1.0-docs-baseline`
- Default branch: `main`
- Source-of-truth development branch: `dev`
- Planned data branches: `draft`, `card`, `progress`

## Product direction

English Recall Hub is not a generic dictionary or course app. It is a personal/family English recall system:

```text
ChatGPT Project
→ draft notes
→ validated formal notes
→ generated cards
→ local mobile SQLite review
→ progress backup snapshots
```

The first MVP focuses on:

1. Multi-profile learning accounts.
2. Draft/Card/Progress branch data flow.
3. Note → Card model.
4. Spaced-repetition review.
5. Pronunciation metadata and one-tap TTS playback.
6. Local-first mobile usage with GitHub-backed sync.

## Required reading before development

Every development, design, UI, data, PR review, or GitHub connector task must start from:

```text
AGENTS.md
AGENTS.common.md
AGENTS.project.md
docs/design/current-core-design.md
docs/requirements/current-requirements.md
docs/changes/CHANGELOG-dev.md
```

For GitHub connector operations, also read:

```text
docs/development/chatgpt-github-connector-guide.md
```

