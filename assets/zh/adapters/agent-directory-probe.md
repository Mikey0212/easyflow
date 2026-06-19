# Agent Directory Probe — 宿主中立 agent 目录探测

## 探测范围

easy-flow 的 agent-selector skill 扫描以下**项目级**目录来发现可用子代理：

```
1. <main_repo_root>/.agents/                  ← 推荐位置（宿主中立）
2. <main_repo_root>/.codebuddy/agents/        ← CodeBuddy 项目级
3. <main_repo_root>/.claude/agents/           ← Claude Code 项目级
```

三个目录全扫，结果合并去重。

### `main_repo_root` 解析

```bash
main_repo_root="$(git rev-parse --show-toplevel)"
```

`--show-toplevel` 始终返回**绝对路径**,在主仓和 worktree 内都可用。在 worktree 内返回 worktree 根(`.claude/` 等宿主目录可能不存在——这是预期行为,扫描为空时弹精简菜单)。

> **禁止使用** `dirname "$(git rev-parse --git-common-dir)"`——它在主仓内返回相对路径 `.`,拼接路径依赖 cwd 正确,实测证明不可靠。

## 与 agent-selector 的关系

本文档定义"去哪里找 agent";`agent-selector` skill 定义"找到后如何推荐、如何选择"——全部扫描 → selector 基于阶段关键词推荐 → 用户在三类选项(项目级 agent / 默认 subagent / inline)中选择 → 主代理按返回的三态各自分支派发。

## Fallback

无候选 / 用户选 D → 主代理用宿主原生 subagent 能力派发,不指定 agent 文件(selector 返回 `"default-subagent"`)。
无候选 / 用户选 I / 用户取消 → 主代理在自己会话内 inline 执行,不派发任何 subagent(selector 返回 `"inline"`)。

> 派发驱动器(`superpowers:subagent-driven-development` / `:executing-plans`)受 HARD STOP H13 全局禁止——详见 `hard-stops.md`。

**不再有任何 plugin 内置 fallback agent 文件。**

## 宿主特定说明

### CodeBuddy

- 项目级：`<main_repo_root>/.codebuddy/agents/`
- 全局级：`$HOME/.codebuddy/agents/`（Windows: `%USERPROFILE%\.codebuddy\agents\`）

### Claude Code

- 项目级：`<main_repo_root>/.claude/agents/`
- 全局级：`$HOME/.claude/agents/`

> **注意**：v1 仅扫描项目级。全局级不在 selector 扫描范围内，仅保留作为宿主文档参考。

