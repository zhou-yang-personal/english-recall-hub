# AGENTS.project.md｜English Recall Hub 项目定制检查清单

本文件只承载本项目定制规则。每日治理同步任务不得自动覆盖本文件；只有用户在当前会话中明确授权时才可以修改。

## B0. 项目身份

- [ ] 项目名称已确认：`English Recall Hub`。
- [ ] 仓库已确认：`zhou-yang-personal/english-recall-hub`。
- [ ] 产品定位已确认：GitHub-backed English recall app，把 ChatGPT 英文学习记录沉淀为可复习 Note/Card，并在手机端本地优先复习。
- [ ] 核心用户场景已确认：单词、短语、语法、句子、日常/商务表达从 ChatGPT Project 进入 draft，经整理后进入 card 分支，App 同步后做 SRS 复习和进度备份。
- [ ] 推荐技术栈已确认：移动端优先；MVP 可使用 `React Native / Expo + TypeScript + SQLite + system TTS + GitHub REST API`，如后续改为 Flutter 或原生实现，必须先更新本文件。

## B1. 当前开发基线检查

- [ ] 默认分支已确认：`main`。
- [ ] 当前 source-of-truth 开发分支已确认：`dev`。
- [ ] 计划数据分支已确认：`draft`、`card`、`progress`。
- [ ] 修改前已从目标分支读取最新目标文件。
- [ ] 常规任务分支命名建议使用：`chatgpt/task-xxx`。
- [ ] Codex 任务分支命名建议使用：`codex/task-xxx`。
- [ ] PR 目标分支默认已确认：`dev`。
- [ ] 只有用户明确要求直接修改目标分支时，才允许跳过任务分支。

## B2. 本项目必读文件检查

开始任何需求设计、代码修改、UI 调整、数据模型调整、同步逻辑调整或 PR 验收前，必须读取：

- [ ] `AGENTS.md`
- [ ] `AGENTS.common.md`
- [ ] `AGENTS.project.md`
- [ ] `README.md`
- [ ] `docs/design/current-core-design.md`
- [ ] `docs/requirements/current-requirements.md`
- [ ] `docs/handoff/latest-handoff.md`，如存在。
- [ ] `docs/changes/CHANGELOG-dev.md`，如存在。

按任务类型追加读取：

- [ ] 涉及 ChatGPT GitHub connector 操作时，已读取项目内 connector guide。
- [ ] 涉及版本时，已读取所有项目版本文件。
- [ ] 涉及依赖时，已读取 package / lock / dependency manifest。
- [ ] 涉及移动端、SQLite、GitHub 同步、TTS、SRS、后台任务或数据分支时，已读取对应模块文件。

## B3. 本项目产品方向一致性检查

- [ ] 本项目不是普通背单词 App、通用词典或课程 App，而是个人/家庭英文主动回忆系统。
- [ ] 核心链路必须保持：`ChatGPT Project → draft 分支 → Builder 校验/去重/编译 → card 分支 → App 本地 SQLite → SRS 复习 → progress 分支近期备份`。
- [ ] ChatGPT 只作为 DraftNote 生成入口，不承担正式卡片库可靠写入、去重、校验和归档职责。
- [ ] App 必须 local-first：本地 SQLite 是运行库，GitHub 只做内容同步和进度备份。
- [ ] `draft` 是入口，`card` 是正式内容库，`progress` 是恢复库，三者不得混用。
- [ ] Pack 是物理分片，不作为主要学习分类；学习分类使用 `collection` / `tag` / `source`。

## B4. 数据模型约束

- [ ] 采用 `DraftNote → Note → Card → ReviewState → ProgressSnapshot` 数据链路。
- [ ] 一个 Note 表示一个知识点；一个 Note 可由 template 生成多张 Card。
- [ ] Card ID 必须稳定，可由 `note_id + template_id + card_type` hash 生成。
- [ ] Note 必须有 `dedupe_key`，用于避免重复知识点。
- [ ] Note 状态至少区分：`active`、`mature`、`suspended`、`archived`。
- [ ] Draft 允许重复和待清洗；正式 Note 不允许未经校验直接发布。
- [ ] 正式 card 分支按 pack 分片；sealed pack 原则上不再修改。
- [ ] `notes_current.jsonl` 仅承接近期新增内容，达到阈值后封包。
- [ ] Manifest 是 App 同步入口；App 不扫描 GitHub 目录作为主同步机制。

## B5. 语音与听力 MVP 约束

MVP 只做以下发音能力：

1. 每个 Note 有 `pronunciation` 字段。
2. 单词 / 短语 / 句子一键朗读。
3. 美音 / 英音偏好。
4. 0.75x / 1.0x / 1.25x 速度。
5. 本地缓存。
6. 听力复习模式。

数据边界：

- [ ] Note 只保存 `pronunciation.text`、`pronunciation.lang`、可选 `pronunciation.hint_cn`。
- [ ] 用户偏好如 accent、speed、cache_enabled 放入 profile settings，不在每个 Note 中重复。
- [ ] 音频文件只存本地 cache，不提交到 `card` 分支。
- [ ] MVP 不做 IPA、云端音频、音频分支、发音评分、音素级纠错。

## B6. 同步与备份约束

- [ ] App 打开时强制检查 card manifest；无网络时使用本地 SQLite。
- [ ] 复习结果先写本地 SQLite，不得每答一题写 GitHub。
- [ ] progress 分支只保存低频 snapshot / event backup，不做实时数据库。
- [ ] progress 备份按 profile/device 独立目录，避免多设备覆盖。
- [ ] 第一版默认一个 profile 只有一个主设备写 progress；多设备复杂合并后续再做。
- [ ] 云端只保留近期备份，避免 progress 分支长期膨胀。

## B7. 本项目版本检查

- [ ] 当前版本已确认：`0.1.0-docs-baseline`。
- [ ] README 当前版本已同步：`README.md`。
- [ ] 最新交接版本已同步：`docs/handoff/latest-handoff.md`。
- [ ] 变更记录已同步：`docs/changes/CHANGELOG-dev.md`。
- [ ] 暂无代码 package 版本文件；新增 App 工程后必须补充对应版本文件清单。
- [ ] 不改依赖时，未修改 lock 文件。

## B8. 本项目构建与 CI 检查

当前状态：

- [ ] 当前只有文档基线，尚未创建移动端 App 工程。
- [ ] 当前未建立 CI；未发现 CI 时，不得声称 CI 通过。
- [ ] App 工程创建后，必须在本文件补充安装、开发、构建、类型检查和测试命令。

## B9. 本项目禁止事项检查

- [ ] 不提交 GitHub token、ChatGPT Project 配置密钥、个人凭据或设备私钥。
- [ ] 不提交手机本地 SQLite、音频缓存、progress 运行快照到 `dev`。
- [ ] 不把音频文件写入 `card` 分支作为 MVP 主链路。
- [ ] 不让 ChatGPT 直接写正式 Note/Card 绕过 Builder 校验。
- [ ] 不把 pack 作为产品主分类暴露给用户。
- [ ] 不在 MVP 做完整 SaaS 账户系统、发音评分或多设备复杂冲突合并。
- [ ] 不做无关 UI 风格重写。
- [ ] 不修改用户未授权的依赖、CI、发布或数据分支历史。

## B10. 本项目交付附加要求

每次修改完成后必须汇报：目标分支、任务分支、commit hash、最新版本号、修改文件清单、做了什么、没做什么、是否修改依赖 / lock 文件、是否执行 build / test / check、未验证项和原因。

## B11. ChatGPT GitHub Connector 操作检查

- [ ] 已读取项目内 connector guide。
- [ ] 使用 `fetch_file` 获取文件内容和 sha。
- [ ] 使用 `update_file` 更新已有 UTF-8 文本文件。
- [ ] 使用 `create_file` 新增小型 UTF-8 文本文件。
- [ ] 不使用 `update_ref` 做分支状态探测。
- [ ] 每次写入后已回读关键文件确认。
- [ ] 遇到 safety block、not fast-forward、sha 冲突时，已停止说明或重新读取后再判断，未盲目重试。
- [ ] 操作结束前已复盘是否出现新的 connector 问题或更优流程。
