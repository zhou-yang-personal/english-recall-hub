# CHANGELOG-dev｜English Recall Hub

## 0.2.0-web-mvp-design｜2026-08-12

### Changed

- Switched the approved first-version platform from React Native/Expo mobile to Web/PWA.
- Set the implementation stack to React, TypeScript, Vite, Dexie/IndexedDB, Web Speech API and Cloudflare Workers Static Assets/Worker API.
- Removed normal account/password, GitHub OAuth and browser PAT input from MVP.
- Defined normal user flow as `open app → choose Profile → review`.
- Defined one-time Profile setup link for new-device cloud backup enrollment.
- Replaced SQLite runtime design with IndexedDB local-first runtime.
- Limited MVP card types to recognition and production because current Notes do not provide `cloze_sentence`.
- Defined current card compatibility around 130 Notes, 27 listed packs and null pack hashes.
- Simplified card sync to compare `manifest.updated_at` and upsert listed packs when changed.
- Removed persistent audio-file cache from Web MVP; retained browser system TTS and language/voice preferences.
- Defined bounded progress snapshots through a Worker with GitHub credentials stored only in Cloudflare Secrets.

### Added

- `docs/design/web-mvp-framework-design.md` as the implementation-level baseline.
- Executable Dexie schema, module layout, Worker API and security boundaries.
- Simple SRS rules and queue priority.
- 22 acceptance use cases.
- Testing and device-acceptance strategy.
- Development estimate: 12–13 working days for full MVP; 8–9 working days for local-only MVP.
- Code estimate: 4,200–6,500 production LOC and 1,200–2,000 test LOC.

### Updated Files

```text
README.md
AGENTS.project.md
docs/design/current-core-design.md
docs/design/web-mvp-framework-design.md
docs/requirements/current-requirements.md
docs/handoff/latest-handoff.md
docs/changes/CHANGELOG-dev.md
```

### Verification

```text
Documentation consistency review: completed
Application build: not run; application project not initialized
Unit/E2E tests: not run; no application code yet
CI: not configured
Dependencies/lock files: not changed
```

## 0.1.0-docs-baseline｜2026-07-07

- 初始化 `dev` 文档基线。
- 建立 `AGENTS.md` / `AGENTS.common.md` / `AGENTS.project.md` 三文件治理结构。
- 写入核心设计与当前需求文档。
- 明确初始主链路：ChatGPT Project → draft → Builder → card → local review → progress backup。
- 尚未创建应用代码、Builder、客户端数据库 Schema 或 CI。
