#!/usr/bin/env bash
# hooks/worktree-rebase-ff.sh — ship Step 3.4 选项 B: 本地 rebase + ff 合入
#
# 用法: bash worktree-rebase-ff.sh <worktree_path> <origin_repo> <branch>
#
# 流程(与现状 ship 3.4 完全一致):
#   1. cd worktree, 取主干 DEFAULT_BRANCH = origin/HEAD 解引用
#   2. git rebase $DEFAULT_BRANCH   (冲突 → exit 1,worktree 处于中间态供用户解决)
#   3. cd origin, git checkout $DEFAULT_BRANCH
#   4. git merge --ff-only $BRANCH
#
# 退出码:
#   0  rebase + ff merge 成功(stdout 输出 default branch 名)
#   1  rebase 冲突(stderr 含提示话术,worktree 留中间态)
#   2  ff merge 失败(stderr 含错误)
#   3  参数错误 / 环境异常(无 origin/HEAD)

set -uo pipefail

WT="${1:-}"
ORIGIN="${2:-}"
BRANCH="${3:-}"

if [ -z "$WT" ] || [ -z "$ORIGIN" ] || [ -z "$BRANCH" ]; then
  echo "[worktree-rebase-ff] 用法: <worktree_path> <origin_repo> <branch>" >&2
  exit 3
fi

# 解析主干分支
DEFAULT_BRANCH="$(cd "$ORIGIN" && git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || true)"
if [ -z "$DEFAULT_BRANCH" ]; then
  echo "[worktree-rebase-ff] 阻断：无法解析 origin/HEAD,请先 git remote set-head origin -a" >&2
  exit 3
fi

# rebase
if ! ( cd "$WT" && git rebase "$DEFAULT_BRANCH" ); then
  echo "[easy-flow] rebase 冲突 → 请在 worktree 内手动 git rebase --continue 解决后重新触发 /ezfl:ship,不自动放弃 worktree。" >&2
  exit 1
fi

# ff merge
if ! ( cd "$ORIGIN" && git checkout "$DEFAULT_BRANCH" && git merge --ff-only "$BRANCH" ); then
  echo "[worktree-rebase-ff] git merge --ff-only 失败" >&2
  exit 2
fi

printf '%s' "$DEFAULT_BRANCH"
exit 0
