# easy-flow Adapters

宿主中立适配指南。每个 adapter 文件描述一个宿主特有约定的指南。

## 文件清单

| Adapter | 用途 |
|---------|------|
| `agent-directory-probe.md` | 各宿主的 agent 目录探测优先级 |
| `command-registration.md` | 各宿主的命令注册方式 |
| `hook-registration.md` | 各宿主的 hook 配置方式 |

## 支持的宿主

1. **CodeBuddy** — 完整支持（plugin + hooks + 多 skill）
2. **Claude Code** — 完整支持

## 退化路径

| 宿主能力 | easy-flow 行为 |
|---------|---------------|
| 完整支持 | 完整工作流 + SessionStart 预警 |
| 支持 plugin 但不支持 hooks | 运行时检测，每个 command 入口自检 |
| 仅支持 skill 加载 | `use_skill("easy-flow:<name>")` 模式 |
| 完全不支持 markdown skill | easy-flow 不可用 |
