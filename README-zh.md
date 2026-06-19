<p align="center">
  <img src="image/title.png" alt="EASYFLOW - Engineering guardrails for AI coding agents" width="100%">
</p>

<p align="center">

[![CI](https://github.com/Mikey0212/easyflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Mikey0212/easyflow/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@code-happy/easyflow?style=flat-square)](https://www.npmjs.com/package/@code-happy/easyflow)
[![npm downloads](https://img.shields.io/npm/dm/@code-happy/easyflow?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@code-happy/easyflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)

</p>

> English version: [README.md](README.md)

OpenSpec 处理 **WHAT**（提案、设计、Spec 生命周期、归档）。

Superpowers 处理 **HOW**（头脑风暴、TDD、子代理驱动开发、代码审查）。

easyflow 在两者之上叠加**编排 + 度量 + 治理**，提供 design → propose → lock → build → audit → ship → reflect 七阶段状态机。

## 为什么需要 easyflow

- **OpenSpec 有提案，但缺乏工程守护** — 从 proposal 到 ship 之间的代码质量、测试覆盖、架构评审等环节没有强制约束。
- **Superpowers 有方法论，但缺乏全链路编排** — brainstorming、TDD、code review 各自独立，没有状态机把它们串成端到端流程。
- **easyflow 补上缺失的中间层** — 以 Constitution 宪法为治理框架、以 scorer 脚本为度量引擎、以 `.harness/` 为运行时状态，把 OpenSpec 和 Superpowers 编排成可审计、可恢复、可度量的工程流程。

## 安装

前置要求：

- Node.js 20+
- npm/npx
- Git
- 可运行 bash 的 shell 环境（Windows 用户建议使用 Git Bash）

```bash
npm install -g @code-happy/easyflow
```

## 快速开始

```bash
cd your-project
easyflow init
```

`easyflow init` 会：

![easyflow init](image/easyflow-init.png)

1. 提示你选择 AI 平台（自动检测已有配置）
2. 选择安装范围：项目级（当前目录）或全局（用户主目录）
3. 选择技能语言：English 或 中文
4. 安装 [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI（通过 npm）
5. 安装 [Superpowers](https://github.com/obra/superpowers) 技能（从 GitHub 拉取）
6. 安装 easy-flow 技能（内置资源，无需网络）并部署到所选平台
7. 按各平台规范生成命令文件（自动适配 15 个 AI 编码平台）

> [!TIP]
> 更新到最新版本：
>
> 执行 `easyflow update` 或 `npm install -g @code-happy/easyflow@latest`

## CLI 命令

<details>
<summary><code>easyflow init [path]</code> — 初始化工作流</summary>

为选定的 AI 编码平台安装 OpenSpec、Superpowers 和 easy-flow 技能。

| 选项 | 描述 |
|------|------|
| `--yes` | 非交互模式，自动选择已检测平台 |
| `--scope <scope>` | 安装范围：`project` 或 `global` |
| `--overwrite` | 覆盖已安装的组件 |
| `--skip-existing` | 跳过已安装的组件 |
| `--lang <lang>` | 技能语言：`zh` 或 `en` |
| `--json` | 输出结构化 JSON |

</details>

<details>
<summary><code>easyflow update [path]</code> — 更新技能到最新版本</summary>

检查各上游仓库的最新 tag，差量更新本地技能文件。

| 选项 | 描述 |
|------|------|
| `--force` | 强制重新拉取所有组件 |

</details>

<details>
<summary><code>easyflow doctor [path]</code> — 诊断安装健康状态</summary>

检查 bash、git、node、openspec CLI、skills-lock.json 等依赖项。

| 选项 | 描述 |
|------|------|
| `--json` | 输出结构化诊断结果 |

</details>

<details>
<summary><code>easyflow status [path]</code> — 显示活跃变更状态（多 worktree 感知）</summary>

从主仓 `.harness/workflow.yaml` 读取活跃变更列表，支持在任何 worktree 内执行。

| 选项 | 描述 |
|------|------|
| `--json` | 输出 JSON 格式 |

</details>

| 命令 | 描述 |
|------|------|
| `easyflow --help` | 显示帮助 |
| `easyflow --version` | 显示版本 |

## 支持平台

`easyflow init` 支持 15 个 AI 编码平台：

| 平台 | 技能目录 | 平台 | 技能目录 |
|------|---------|------|---------|
| Claude Code | `.claude/` | CodeBuddy | `.codebuddy/` |
| Cursor | `.cursor/` | Codex CLI | `.codex/` |
| Gemini CLI | `.gemini/` | Windsurf | `.windsurf/` |
| Cline | `.cline/` | RooCode | `.roo/` |
| GitHub Copilot | `.github/` | Trae | `.trae/` |
| Lingma | `.lingma/` | Amazon Q | `.amazonq/` |
| Augment CLI | `.augment/` | Kiro | `.kiro/` |
| OpenCode | `.opencode/` | | |

## 八阶段工作流

![ezfl commands](image/ezfl-commands.png)

```
 /ezfl:design → /ezfl:propose → /ezfl:lock → /ezfl:build → /ezfl:audit → /ezfl:ship → /ezfl:reflect
 (探索)          (四件套)        (评审)        (实施)        (审计)        (交付)        (回顾)
```

| 阶段 | 命令 | 产出物 |
|------|------|--------|
| Design | `/ezfl:design` | `pre_design.md`（强制结构化讨论后的设计方案） |
| Propose | `/ezfl:propose` | OpenSpec 四件套（proposal/design/specs/tasks） |
| Lock | `/ezfl:lock` | `review-report.md`（工程评审 + 跨模型交叉评审） |
| Build | `/ezfl:build` | 代码实现（由 subagent 执行 `/opsx:apply`） |
| Audit | `/ezfl:audit` | Constitution 合规审计 + 5 项 scorer 评分 |
| Ship | `/ezfl:ship` | 终验 + rebase 合入 + worktree 清理 + 归档 |
| Reflect | `/ezfl:reflect` | 度量趋势、override 分析、改进建议 |

### 附加命令

| 命令 | 描述 |
|------|------|
| `/ezfl:constitution` | 宪法管理（CREATE / AMEND / SHOW） |

## 项目结构（安装后）

```
your-project/
├── .claude/skills/              # 平台技能目录（按 easyflow init 选择的平台）
│   ├── easy-flow/               # easy-flow 主目录
│   │   ├── skills/              # 各阶段 skill（含 policies/references）
│   │   ├── scripts/             # hook + scorer 脚本
│   │   ├── templates/           # 模板文件
│   │   └── commands/            # slash command 定义
│   ├── brainstorming/           # Superpowers 技能
│   ├── test-driven-development/
│   └── ...
├── .harness/                    # easy-flow 运行时状态
│   ├── workflow.yaml            # 活跃变更游标
│   ├── changes/<change_id>/     # 单变更业务档案
│   └── .cache/                  # session_id、plugin_root
├── openspec/                    # OpenSpec 制品
│   └── changes/<name>/
│       ├── proposal.md
│       ├── design.md
│       ├── specs/
│       └── tasks.md
└── skills-lock.json             # 版本锁定文件
```

## 核心特性

- **Constitution 宪法治理** — 项目级工程原则，四个注入点（A/B/C/D）在各阶段自动合规检查
- **确定性 Hook 脚本** — `draft-create.sh`、`worktree-create.sh`、`harness-sync.sh` 等，把关键操作从 LLM"脑补"降级为真实 bash 执行
- **多 Worktree 并发** — 每个 change 可在独立 worktree 隔离开发，主仓保留 `.snapshot/` 只读快照兜底
- **跨模型交叉评审（Outside Voice）** — Lock 阶段自动派发独立 subagent 做第二轮评审
- **模板强制加载** — 所有生成 markdown 的阶段必须先 `read_file` 模板再输出，杜绝 LLM 凭记忆胡写
- **Rebase 合入** — Ship 阶段使用 `git rebase + ff-only`，保持线性历史
- **全平台命令适配** — 针对 15 个 AI 编码平台自动生成正确格式的命令文件（Codex 全局 prompts、Windsurf workflows、Cursor 扁平命令等）

## 版本约束

| 组件 | 最低版本 | 来源 |
|------|---------|------|
| easy-flow | 内置 | npm 包内置（bundled） |
| superpowers | ≥ 4.0.0 | GitHub (git tag) |
| openspec | ≥ 1.4.0 | npm (@fission-ai/openspec) |

## 致谢

easyflow 站在以下优秀项目及其作者的肩膀上：

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — [Fission AI](https://github.com/Fission-AI) — 处理提案、设计和归档的规范生命周期框架
- **[Superpowers](https://github.com/obra/superpowers)** — [Jesse Vincent (@obra)](https://github.com/obra) — 提供头脑风暴、TDD、子代理驱动开发、代码审查等方法论技能
- **[Comet](https://github.com/rpamis/comet)** — npm cli的设计灵感与参考来源
- **[gstack](https://github.com/aspect-build/rules_lint)** — 文档审查功能参考来源

感谢所有贡献者和开源社区的支持。


