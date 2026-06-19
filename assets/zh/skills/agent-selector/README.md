# agent-selector — 对接指南

## 面向谁

本文档面向 easy-flow 内部 skill 开发者，说明如何在派发点 skill 中接入 agent-selector。

## 接入步骤

### 1. 确定派发点 ID

查看 `policies/description-keyword-rules.md`，确认你的派发点已注册。若无，先在该文件和设计稿 §4 中新增。

### 2. 在派发前插入 selector 调用

在你的 SKILL.md 中，在主代理通过宿主原生 Task / AgentTool 派发 subagent 之前，加入如下指令：

```markdown
### Agent Selection（派发前）

在执行下一步的 subagent 派发之前，调用 `easy-flow:agent-selector` skill：
- 传入 `dispatch_point_id` = `<你的派发点 ID>`
- 根据返回值(三态之一)决定:
  - 返回 agent 文件路径(string) → 主代理用宿主原生 Task tool,以该路径作为 `subagent_path` 派发
  - 返回 `"default-subagent"` → 主代理用宿主原生 subagent 能力派发,不指定 agent 文件
  - 返回 `"inline"` → 主代理在自己会话内 inline 执行,不派发 subagent
```

### 3. 传递 selector 返回值给宿主 adapter

selector 返回值是三态之一,调用方按下表分支:

| 返回值 | 调用方动作 |
|---|---|
| agent 文件路径(string) | **CodeBuddy**:Task tool 的 `subagent_path` 参数传入该路径;**Claude Code**:按 `references/host-adapters.md` 对应章节执行 |
| `"default-subagent"` | 主代理用宿主原生 subagent 能力派发,不指定 `subagent_path` |
| `"inline"` 或 宿主无 subagent 能力 | 主代理在自己会话内 inline 执行后续命令,不派发任何 subagent |

### 示例（build.implementer）

```markdown
### 派发前：Agent Selection

调用 easy-flow:agent-selector,dispatch_point_id = `build.implementer`。

按返回值三态分支:
- agent 路径(string) → 主代理用宿主原生 Task tool,以该路径作为 subagent_path 派发
- `"default-subagent"` → 主代理用宿主原生 subagent 能力派发,不指定 agent 文件
- `"inline"` → 主代理在自己会话内 inline 执行 /opsx:apply,不派发 subagent
```

> 三态以外的派发路径(如 superpowers 派发驱动器)受 HARD STOP H13 禁止——详见 `hard-stops.md`。

## 缓存行为

selector 每次被调用时从磁盘重读缓存（`.harness/.cache/agent-selection.json`）。

- 首次调用：弹菜单让用户选择
- 后续调用（同一派发点、同一会话）：静默复用缓存
- 用户选了"不再问" → 整个会话内该派发点都不再弹菜单
- 新会话 → session_id 变化 → 缓存失效 → 重新弹菜单

## 相关文档

- SKILL.md：完整流程定义
- policies/description-keyword-rules.md：关键词匹配表
- policies/session-memory-protocol.md：缓存读写协议
- policies/menu-presentation.md：菜单格式规范
