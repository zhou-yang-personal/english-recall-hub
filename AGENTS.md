# AGENTS.md｜项目开发协作执行入口

本文件是本仓库进行需求设计、代码修改、UI 调整、数据结构变更、PR 验收和人工开发时的最高优先级入口。所有执行者必须先读取本文件；无法读取时必须暂停并要求用户提供文件内容。

## 1. 必须继续读取

在执行任何需求设计、代码修改、UI 调整、数据流调整、PR 验收或文档治理前，必须继续读取：

```text
AGENTS.common.md
AGENTS.project.md
```

如果本次涉及 GitHub connector 操作，还必须读取：

```text
docs/development/chatgpt-github-connector-guide.md
```

如果本次涉及产品设计、数据模型、卡片生成、同步、进度备份或发音功能，还必须读取：

```text
docs/design/current-core-design.md
docs/requirements/current-requirements.md
```

## 2. 文件职责

```text
AGENTS.common.md   # 跨项目通用规则，可由公共治理仓同步
AGENTS.project.md  # 本项目定制规则，不得被公共同步任务覆盖
AGENTS.md          # 固定入口，只负责引导读取和声明优先级
```

## 3. 冲突优先级

```text
用户明确指令 > AGENTS.project.md > AGENTS.common.md > 公共治理仓模板 > 一般经验
```

## 4. 自动同步边界

每日治理同步任务只允许自动更新：

```text
AGENTS.common.md
docs/development/chatgpt-github-connector-guide.md
```

每日治理同步任务不得自动覆盖：

```text
AGENTS.project.md
AGENTS.md
.github/pull_request_template.md
docs/design/current-core-design.md
docs/requirements/current-requirements.md
docs/handoff/latest-handoff.md
docs/changes/CHANGELOG-dev.md
项目业务代码
项目业务文档
卡片数据分支内容
进度备份分支内容
依赖文件和 lock 文件
```

除非用户在当前会话中明确授权。

## 5. 执行要求

- 修改前必须读取对应文件。
- 文件缺失时必须说明“未发现 / 未确认”。
- 涉及版本号时必须按 `AGENTS.project.md` 的项目版本规则同步。
- 不改依赖时不得修改 lock 文件。
- 不得虚构 build / test / CI 通过。
- GitHub connector 操作结束前，必须检查是否出现新问题或更优流程；如有，更新 connector guide 或公共治理仓。
