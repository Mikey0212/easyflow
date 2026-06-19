#!/usr/bin/env bash
# hooks/ship-cleanup.sh — ship Step 6.1 主仓游标重置 + 残留清理
#
# 用法:
#   bash ship-cleanup.sh <change_id> <origin_repo> [--plugin-root <path>]
#
# 步骤:
#   a. workflow.yaml 移除 active_changes 中本 change entry
#   b. rm -rf changes/<change_id>.snapshot 与 changes/<change_id>
#
# 退出码:
#   0  成功
#   1  a 步失败（workflow.yaml 写失败）

set -uo pipefail

CHANGE_ID="${1:-}"
ORIGIN_REPO="${2:-}"
PLUGIN_ROOT=""
shift 2 2>/dev/null || true
while [ $# -gt 0 ]; do
  case "$1" in
    --plugin-root) PLUGIN_ROOT="${2:-}"; shift 2 ;;
    *) echo "[ship-cleanup] 未知参数 $1" >&2; exit 1 ;;
  esac
done

if [ -z "$CHANGE_ID" ] || [ -z "$ORIGIN_REPO" ]; then
  echo "[ship-cleanup] 用法: <change_id> <origin_repo>" >&2; exit 1
fi
if [ -z "$PLUGIN_ROOT" ]; then
  PLUGIN_ROOT="$(cat "$ORIGIN_REPO/.harness/.cache/.plugin_root" 2>/dev/null || true)"
fi
if [ -z "$PLUGIN_ROOT" ] || [ ! -d "$PLUGIN_ROOT" ]; then
  echo "[ship-cleanup] 阻断：无法解析 plugin_root" >&2; exit 1
fi

# --- a. 删 active_changes entry ---
if ! bash "$PLUGIN_ROOT/hooks/workflow-entry.sh" delete-active --skill ship \
     --where-change-id "$CHANGE_ID" --repo-root "$ORIGIN_REPO"; then
  echo "[ship-cleanup] FAIL: delete-active 失败" >&2; exit 1
fi

# --- b. 清 changes 目录残留 ---
rm -rf "$ORIGIN_REPO/.harness/changes/${CHANGE_ID}.snapshot" 2>/dev/null || true
rm -rf "$ORIGIN_REPO/.harness/changes/${CHANGE_ID}" 2>/dev/null || true

exit 0
