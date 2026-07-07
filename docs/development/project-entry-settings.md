# English Recall Hub｜External Entry Settings

This document records what should be configured outside the repository.

## 1. ChatGPT Project Instructions

Recommended project instruction for English-learning conversations:

```text
When the user asks about English words, phrases, grammar, sentences, pronunciation, or expression optimization, explain normally first.
If the point is worth reviewing, generate a DraftNote for English Recall Hub.
Default SYNC_PROFILE_ID should be configured per ChatGPT Project.
DraftNotes must target the `draft` branch, not the `card` branch.
Do not write formal Note/Card directly.
Use one Note per knowledge point.
Keep pronunciation minimal: text, lang, optional hint_cn.
```

Per-project variables to record in the project description or pinned source:

```text
SYNC_REPO=zhou-yang-personal/english-recall-hub
SYNC_PROFILE_ID=manman
SYNC_DRAFT_BRANCH=draft
SYNC_DRAFT_PATH=profiles/manman/inbox
SYNC_CARD_BRANCH=card
SYNC_CARD_PATH=profiles/manman
SYNC_PROGRESS_BRANCH=progress
SYNC_PROGRESS_PATH=profiles/manman
```

For family members, use different `SYNC_PROFILE_ID` and paths.

## 2. Project Introductions / New Session Opener

Recommended new-session opener:

```text
你现在接手 English Recall Hub 项目。请先读取仓库根目录 AGENTS.md，并按其要求继续读取 AGENTS.common.md、AGENTS.project.md、README.md、docs/design/current-core-design.md、docs/requirements/current-requirements.md、docs/changes/CHANGELOG-dev.md。如涉及 GitHub connector 操作，还必须读取 docs/development/chatgpt-github-connector-guide.md。当前 source-of-truth 分支是 dev，数据分支规划为 draft/card/progress。不要直接写正式 card 分支，ChatGPT 只生成 DraftNote。
```

## 3. Codex / Development Agent Prompt

Recommended Codex entry:

```text
Repository: zhou-yang-personal/english-recall-hub
Source-of-truth branch: dev
Before any design or code change, read AGENTS.md and all required files listed inside it.
Follow the current design in docs/design/current-core-design.md.
Do not commit tokens, SQLite DBs, audio cache, progress snapshots, build artifacts, or generated app packages.
Do not implement SaaS account system, cloud TTS, pronunciation scoring, or multi-device merge unless explicitly requested.
```

## 4. GitHub Repository Settings

Recommended settings:

- Keep `main` as stable default branch.
- Use `dev` as source-of-truth development branch.
- Create protected or clearly separated data branches later: `draft`, `card`, `progress`.
- Do not allow accidental direct writes to `card` from ChatGPT except through Builder workflow.
- Use fine-grained tokens with minimum permissions if mobile app sync requires GitHub write access.

## 5. Project Source Files

Add the following files to ChatGPT Project Sources when available:

```text
AGENTS.md
AGENTS.common.md
AGENTS.project.md
README.md
docs/design/current-core-design.md
docs/requirements/current-requirements.md
docs/development/project-entry-settings.md
```
