# AGENTS.project.md｜English Recall Hub 项目定制检查清单

本文件只承载本项目定制规则。公共治理同步任务不得自动覆盖本文件；只有用户在当前会话中明确授权时才可以修改。

## B0. 项目身份

- [ ] 项目名称：`English Recall Hub`。
- [ ] 仓库：`zhou-yang-personal/english-recall-hub`。
- [ ] 当前版本：`0.7.1-m5-pwa-refresh`。
- [ ] 产品定位：面向个人和家庭的多语言主动回忆工具，把 ChatGPT 学习记录转为正式 Note/Card，并通过 Web/PWA 完成离线复习、朗读和账号进度同步。
- [ ] 第一版平台：iPhone、Android、PC 浏览器；可安装为 PWA，不开发原生 iOS/Android App。
- [ ] 第一版技术栈：`React + TypeScript + Vite + Dexie/IndexedDB + Web Speech API + Cloudflare Worker API/Static Assets + Supabase Postgres/RLS`。

## B1. 分支与开发基线

- [ ] 默认分支：`main`。
- [ ] source-of-truth 开发分支：`dev`。
- [ ] 数据分支：`draft`、`card`、`progress`。
- [ ] 常规任务分支：`chatgpt/task-xxx`。
- [ ] Codex 任务分支：`codex/task-xxx`。
- [ ] PR 默认目标分支：`dev`。
- [ ] 只有用户明确要求直接修改目标分支时，才允许跳过任务分支。
- [ ] 修改前必须从目标分支重新读取最新文件和 SHA。

## B2. 必读文件

开始任何需求设计、代码修改、UI 调整、数据模型调整、同步逻辑调整或 PR 验收前，必须读取：

- [ ] `AGENTS.md`
- [ ] `AGENTS.common.md`
- [ ] `AGENTS.project.md`
- [ ] `README.md`
- [ ] `docs/design/current-core-design.md`
- [ ] `docs/design/web-mvp-framework-design.md`
- [ ] `docs/requirements/current-requirements.md`
- [ ] `docs/handoff/latest-handoff.md`，如存在。
- [ ] `docs/changes/CHANGELOG-dev.md`，如存在。

按任务类型追加读取：

- [ ] GitHub connector：`docs/development/chatgpt-github-connector-guide.md`。
- [ ] 版本变更：全部版本文件。
- [ ] 依赖变更：`package.json` 和 lock 文件。
- [ ] Cloudflare、IndexedDB、TTS、PWA、SRS、同步或备份：对应源码、配置和测试。

## B3. 产品与架构硬约束

- [ ] 项目不是词典、课程平台或完整 SaaS，而是个人/家庭主动回忆工具。
- [ ] 核心链路保持：`ChatGPT Project → draft → Builder → card → Web/PWA IndexedDB → SRS → Supabase ReviewEvents`。
- [ ] ChatGPT 只生成 DraftNote，不直接绕过 Builder 修改正式 Note/Card。
- [ ] Web App local-first：IndexedDB 是运行时数据源；GitHub 只负责内容同步和进度备份。
- [ ] 默认流程无需登录；新设备仅首次输入家庭同步码换取长期 HttpOnly 设备 Cookie，之后前台直接选择学习者。
- [ ] 日常打开复用已持久化会话；云端暂不可用时，已初始化设备仍可离线复习并保留待同步事件。
- [ ] 必须区分后台 `FamilySpace/DeviceGrant`、内部进度身份 `LearnerProfile` 与 GitHub `ContentProfile`；前台直接把 `card/profiles/*` 的 ContentProfile 作为学习者目录，平台凭据只属于 Worker。
- [ ] Supabase secret/service-role key、数据库密码、GitHub PAT 和 Cloudflare token 不进入浏览器、仓库或日志。
- [ ] Pack 是物理存储分片；Collection/Tag 才是学习范围。
- [ ] UI 第一版为中文，但数据模型必须支持 `learning_lang=en/es/...`。

## B4. 当前 MVP 范围

必须实现：

1. 免登录地直接选择 GitHub ContentProfile；LearnerProfile 由系统自动取得/创建，以及新设备一次性家庭同步码配对。
2. 读取公开 `card` 分支的 manifest、pack 和 template。
3. Dexie/IndexedDB 本地保存 Note、Card、复习状态和同步状态。
4. Recognition / Production 两种卡片。
5. Unknown / Fuzzy / Known 三档简单 SRS。
6. 离线打开和离线复习。
7. Web Speech API 朗读；英文/西语语言选择和三档速度。
8. 听力模式：先播放、隐藏文本、揭示答案。
9. 本地 ReviewEvent/ReviewState 原子保存。
10. Supabase ReviewEvent 幂等增量同步和新设备重建。
11. 本地 progress JSON 导出/导入兜底。
12. PWA 安装与移动端适配。
13. 复习机制说明、单条目下次复习/次数/遗忘/阶段信息和本地进度统计视图。
14. 可从设置页一键重置应用资源缓存并加载最新版，不删除 IndexedDB 学习数据、待同步事件或设备配对 Cookie。

第一版明确不做：

- 普通账号密码、社交登录、GitHub OAuth、用户输入 PAT。
- 原生 iOS/Android App、App Store、TestFlight、APK。
- 实时协同、家庭邀请/角色、人工冲突处理界面。
- 精确后台定时任务、Push Notification。
- Cloze / Output / Contrast 正式启用。
- 云 TTS、音频文件缓存、IPA、发音评分。
- D1、KV、R2、家庭角色/邀请和复杂后端框架。
- 支付、广告、社区卡组、复杂埋点。

## B5. 数据模型约束

- [ ] 数据链路：`DraftNote → Note → Card`；进度链路：`LearnerProfile + Card → ReviewEvent → ReviewState`。
- [ ] 一个 Note 表示一个知识点；一个 Note 可生成多张 Card。
- [ ] `card_id = hash(note_id + template_id + card_type)`，必须跨设备稳定。
- [ ] Note 必须有 `dedupe_key`。
- [ ] Note 状态至少包括：`active`、`mature`、`suspended`、`archived`。
- [ ] 第一版兼容 card 分支现有 schema，不要求 Builder 先重构。
- [ ] 当前 manifest 的 pack `sha256` 为空，因此 MVP 使用 `manifest.updated_at` 判断变化，变化后重新读取列出的 pack 并 upsert；不得伪造 checksum 校验。
- [ ] 现有模板引用的 `cloze_sentence` 在 Note 中不存在，MVP 只启用 recognition / production。
- [ ] 同步失败不得清空本地 Note/Card；继续使用最后一次成功数据。
- [ ] ReviewEvent 是同步事实，ReviewState 是本地物化视图；禁止用整包快照覆盖作为多设备主同步。
- [ ] 每个 ReviewEvent 使用 UUID 幂等键；远端 `sync_seq` 是跨设备顺序。

## B6. TTS 与多语言约束

- [ ] Note 中只保存 `pronunciation.text`、`pronunciation.lang`、可选 `pronunciation.hint_cn`。
- [ ] voice、accent、speed 属于 Profile 设置，不在每个 Note 中重复。
- [ ] 使用浏览器 Web Speech API，实际 voice 以设备可用列表为准，必须有语言级 fallback。
- [ ] 英语支持 `en-US` / `en-GB`；西语优先支持 `es-MX`，并兼容 `es-ES` / `es-US`。
- [ ] 速度仅提供 `0.75x / 1.0x / 1.25x`。
- [ ] Web MVP 不承诺音频文件缓存；缓存的是卡片、进度和语音偏好。

## B7. 账号与进度同步约束

- [ ] 每次评分在一个 Dexie 事务中写入 pending ReviewEvent 和 ReviewState，提交后才能进入下一张卡。
- [ ] 同步顺序为：上传 pending 事件、按 `sync_seq` 分页拉取、幂等 upsert、本地重放、事务更新 cursor。
- [ ] PWA 不承诺精确后台执行；同步触发为应用打开、联网恢复、复习完成、手动操作和前台防抖。
- [ ] 应用资源更新必须与 IndexedDB 业务数据、同步状态和设备授权分离；不得把“清空全部站点数据”作为常规更新方式。
- [ ] Supabase 使用独立 `english_recall` schema；所有暴露表必须显式授权并启用 RLS。
- [ ] 浏览器不得直连 Supabase 进度表；Worker 验证签名设备 Cookie 后以服务端密钥访问，并对每次查询/写入强制限定 `FAMILY_OWNER_USER_ID`。
- [ ] `progress` 分支不再作为 MVP 运行时数据库，只保留未来冷备份可能性。

## B8. 工程与模块约束

当前目录基线：

```text
src/app              启动、路由、上下文
src/features         auth/profile/content-sync/review/progress-sync/tts
src/domain           Note/Card/SRS/ReviewEvent 重放纯逻辑
src/infrastructure   Dexie/GitHub/Supabase/Web Speech adapters
src/shared           小型通用错误、ID、时间工具
supabase             本地配置、migration、seed
tests                unit/integration/e2e
```

- [ ] 不引入 Redux/Zustand；首版使用 React state/context 和 Dexie live query。
- [ ] 不引入 Axios、Hono、tRPC、GraphQL、Tailwind 或重型 UI 组件库。
- [ ] 使用轻量 Ports and Adapters；只为真实外部边界建立 port，不引入 DI 容器。
- [ ] 网络请求使用原生 `fetch`。
- [ ] 数据边界使用 Zod 校验。
- [ ] 样式使用 CSS Modules / CSS Variables。

## B9. 版本、构建与测试

当前文档版本文件：

- [ ] `README.md`
- [ ] `AGENTS.project.md`
- [ ] `docs/design/current-core-design.md`
- [ ] `docs/design/web-mvp-framework-design.md`
- [ ] `docs/requirements/current-requirements.md`
- [ ] `docs/handoff/latest-handoff.md`
- [ ] `docs/changes/CHANGELOG-dev.md`

- [ ] `package.json`
- [ ] `wrangler.jsonc` 或 `wrangler.toml`
- [ ] PWA manifest 中的版本标记，如存在。

当前命令：

```text
npm install
npm run dev
npm run build
npm run typecheck
npm run test
npm run deploy
```

- [ ] 应用代码已创建，CI 和 E2E 尚未创建；未执行时不得声称通过。
- [ ] 不改依赖时不得修改 lock 文件。

## B10. 禁止事项

- [ ] 不提交 GitHub token、Cloudflare/Supabase Secret、数据库密码、个人凭据或设备私钥。
- [ ] 不提交 IndexedDB 导出、progress 运行快照到 `dev`、浏览器缓存、日志、安装包或构建产物。
- [ ] 不把 GitHub token、Supabase secret/service-role key 或数据库密码编译进前端 JS；publishable key 可作为前端配置。
- [ ] 不让 ChatGPT 直接修改正式 card pack。
- [ ] 不把未来能力提前做成当前复杂模块。
- [ ] 不做无关重构、全局格式化或未经授权的依赖/CI/部署变更。

## B11. 交付要求

每次修改后必须报告：目标分支、任务分支、commit/PR、版本、文件清单、核心逻辑、使用方式、验证命令和结果、未验证项、依赖/lock 变化及风险。

GitHub connector 操作还必须：先读 connector guide；已有文件使用 `fetch_file + update_file`；新增小文件使用 `create_file`；写入后回读；不使用 `update_ref` 做探测；遇到 safety block 或 SHA 冲突停止盲试。
