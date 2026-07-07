# English Recall Hub｜Latest Handoff

Version: `0.1.0-docs-baseline`
Updated: `2026-07-07`
Branch: `dev`

## Current State

The repository has been initialized as a documentation-first baseline for the English Recall Hub mobile app.

Current confirmed direction:

```text
ChatGPT Project
→ draft branch DraftNote inbox
→ Builder validation / dedupe / normalization
→ card branch formal Note packs
→ mobile App local SQLite
→ SRS review and pronunciation playback
→ progress branch recent backup snapshots
```

## Created Governance Baseline

- `AGENTS.md`: fixed entrypoint.
- `AGENTS.common.md`: common cross-project checklist from governance kit.
- `AGENTS.project.md`: English Recall Hub project-specific rules.
- `docs/development/chatgpt-github-connector-guide.md`: connector workflow and project-specific cautions.

## Created Product Documents

- `README.md`
- `docs/design/current-core-design.md`
- `docs/requirements/current-requirements.md`
- `docs/changes/CHANGELOG-dev.md`

## Key Architecture Decisions

1. Use Note → Card model.
2. Pack is physical storage shard; Collection/Tag is learning classification.
3. App is local-first and uses SQLite as runtime source of truth.
4. GitHub card branch is content sync source, not runtime DB.
5. GitHub progress branch is recent backup source, not realtime DB.
6. Pronunciation MVP uses system TTS and local cache only.

## Next Recommended Steps

1. Create `draft`, `card`, `progress` branches from `dev` baseline.
2. Add schema documents for DraftNote, Note, Template, Manifest and ProgressSnapshot.
3. Decide mobile framework and initialize app project on `dev`.
4. Add local SQLite schema.
5. Implement profile settings and card sync skeleton.
6. Implement system TTS playback and audio cache.
7. Implement first SRS review loop.

## Verification

No build/test was run because the repository currently contains documentation only and no mobile app code.
