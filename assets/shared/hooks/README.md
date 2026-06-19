# easy-flow Hooks

本目录包含 easy-flow 的 hook 脚本（POSIX + Windows 双平台），**所有脚本只在 plugin 内部执行，不会被拷贝到项目目录**。

## Hook 清单

| Hook | 用途 | 创建于 |
|------|------|--------|
| `session-start.sh` | SessionStart：写 `.harness/.cache/.plugin_root`、首次物化 `harness.toml`、superpowers 探测 | Phase 10 |
| `constitution-validity.sh` | 宪法有效性判定（Law #4 升级） | Phase 4 |

## 路径定位约定

skill 调用 plugin 内脚本的统一姿势（`.plugin_root` 由 SessionStart 每次会话覆盖写入当前 plugin 绝对路径）：

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/<script>.sh" [args...]
```

宿主配置（含降级方案）详见 `adapters/hook-registration.md`。
