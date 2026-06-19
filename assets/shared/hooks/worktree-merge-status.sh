#!/usr/bin/env bash
# hooks/worktree-merge-status.sh — ship Step 3.2 worktree 脏检查 + 合并状态判定
#
# 用法: bash worktree-merge-status.sh <worktree_path> <origin_repo> <branch>
#
# 退出码:
#   0  worktree 干净 + 已合并(调用方设 ALREADY_MERGED=1 后跳到 Step 3.4.5)
#   1  worktree 干净 + 未合并(调用方进入 Step 3.3 询问用户)
#   2  worktree 脏(stderr 已含阻断话术 + git status --short 输出)
#   3  参数错误 / git 命令异常
#
# 阻断话术(与现状 ship 3.2 一致):
#   [easy-flow] 阻断：worktree 有未提交文件,请先 commit 再 ship。

set -uo pipefail

WT="${1:-}"
ORIGIN="${2:-}"
BRANCH="${3:-}"

if [ -z "$WT" ] || [ -z "$ORIGIN" ] || [ -z "$BRANCH" ]; then
  echo "[worktree-merge-status] 用法: <worktree_path> <origin_repo> <branch>" >&2
  exit 3
fi
if [ ! -d "$WT" ] || [ ! -d "$ORIGIN" ]; then
  echo "[worktree-merge-status] 阻断：worktree_path 或 origin_repo 不是目录" >&2
  exit 3
fi

# --- 1. 脏检查 ---
DIRTY=$(cd "$WT" && git status --porcelain 2>/dev/null | wc -l | xargs)
if [ "${DIRTY:-0}" -gt 0 ]; then
  echo "[easy-flow] 阻断：worktree 有未提交文件,请先 commit 再 ship。" >&2
  ( cd "$WT" && git status --short 2>/dev/null ) >&2
  exit 2
fi

# --- 2. 合并状态判定 ---
if ( cd "$ORIGIN" && git merge-base --is-ancestor "$BRANCH" HEAD ) 2>/dev/null; then
  exit 0   # 已合并
fi
exit 1     # 未合并
