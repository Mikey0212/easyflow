# workflow-lock — workflow.yaml 写操作互斥锁 policy

## 锁文件契约

- 路径：`<main_repo_root>/.harness/.locks/workflow.lock`
- 内容（单行，空格分隔）：`<skill_name> <PID> <unix_ts> <ISO_8601_UTC>`
  - 例：`design 12345 1717000000 2026-05-28T19:00:00Z`
- 不入仓：与 `ship.lock` 共用 `.locks/` 目录，已在 `.harness/.gitignore`

## 执行方式（强制脚本化）

任何对 `workflow.yaml` 的写操作**必须**通过 `hooks/workflow-entry.sh` 执行——脚本内部已固化"加锁 → RMW → 写后校验 → trap 释放"完整流程，调用方只需传 op 与参数：

```bash
PLUGIN_ROOT="$(cat .harness/.cache/.plugin_root)"
bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" <op> --skill <skill_name> [op-specific args]
```

支持的 op（与"写者清单"一一对应）：

| op | 用途 | 必填参数 |
|---|---|---|
| `append-active` | 在 `active_changes` 末尾追加 entry | `--change-id --phase --worktree-path --started-at` |
| `update-active` | 更新指定 entry 的 phase / worktree-path | `--where-change-id --set phase=<p> [--set worktree-path=<wt>]` |
| `rename-active` | 改 entry 的 change_id（draft → 正式） | `--from <old> --to <new>` |
| `delete-active` | 删指定 entry | `--where-change-id <id>` |

## 退出码语义（调用方按此分支处理）

| exit | 含义 | 调用方动作 |
|---|---|---|
| 0 | 成功(锁获取 + 修改 + 写后校验全部通过) | 继续后续逻辑 |
| 1 | 锁获取失败(6s 超时或 mkdir 失败) | 阻断,输出 HARD STOP H12 自检话术(脚本 stderr 已含详情) |
| 2 | 写后校验失败(乐观锁兜底,已自动重试 1 次仍不一致) | 阻断,输出 H12 写后校验失败话术,提示用户人工介入 |
| 3 | 参数错误 / 输入文件异常 | 阻断,人工排查 |

## 写者清单（如有新增请同步更新）

| Skill | 写位置 | 调用 op |
|---|---|---|
| `design` | 1.4 起草 entry | `append-active` |
| `design` | 4.4 重命名 entry | `rename-active` |
| `design` | 1.2 选项 B 清残留 | `delete-active` |
| `propose` | 1.3.A.4 切换 phase + worktree | `update-active --set phase=propose --set worktree-path=...` |
| `propose` | 1.3.B 切换 phase（留主仓） | `update-active --set phase=propose` |
| `ship` | 6.1.a ship 完成清 entry | `delete-active` |
