#!/usr/bin/env bash
# harness-sync.sh — worktree 产物合回脚本(确定性执行)
#
# 由 ship Step 3.4.5 调用。严格只拷贝 4 类 harness 产物,
# 其他一切(openspec/ / src / tests / docs 等)一律不动。
#
# 用法:
#   bash harness-sync.sh <worktree_path> <origin_repo> <change_id> [--overwrite|--suffix|--skip]
#
# 参数:
#   worktree_path   被合回的 worktree 绝对路径
#   origin_repo     主仓绝对路径
#   change_id       当前 change 标识(用于 archive 子目录名)
#   --overwrite     archive 目录已存在时覆盖(对应用户选 A)
#   --suffix        archive 目录已存在时加时间戳后缀保留旧版(对应用户选 B)
#   --skip          archive 目录已存在时跳过(对应用户选 C)
#   缺省(无第 4 参数) → 若 archive 已存在则 exit 2(让主代理弹菜单)
#
# 退出码:
#   0  全部成功(harness_sync=synced)
#   1  部分失败(harness_sync=partial_failure),失败项写入 stderr
#   2  archive 目录冲突,需主代理交互(harness_sync 由主代理根据用户选择填写)
#   3  worktree .harness 不存在(harness_sync=skipped_no_source)
#
# stdout 输出 JSON 汇总(一行):
#   {"metrics_files":<N>,"overrides_lines":<K>,"state_yaml":<bool>,"pre_design":<bool>}

set -uo pipefail

# --- 参数校验 ----------------------------------------------------------------
WORKTREE_PATH="${1:-}"
ORIGIN_REPO="${2:-}"
CHANGE_ID="${3:-}"
CONFLICT_MODE="${4:-}"

if [ -z "$WORKTREE_PATH" ] || [ -z "$ORIGIN_REPO" ] || [ -z "$CHANGE_ID" ]; then
  echo "[harness-sync] 用法: harness-sync.sh <worktree_path> <origin_repo> <change_id> [--overwrite|--suffix|--skip]" >&2
  exit 1
fi

WORKTREE_HARNESS="$WORKTREE_PATH/.harness"
ORIGIN_HARNESS="$ORIGIN_REPO/.harness"
ARCHIVE_DIR="$ORIGIN_HARNESS/archive/$CHANGE_ID"

# --- Step 0: 检查 worktree .harness 存在性 -----------------------------------
if [ ! -d "$WORKTREE_HARNESS" ]; then
  echo "[harness-sync] 警告: $WORKTREE_HARNESS 不存在,跳过合回" >&2
  printf '{"metrics_files":0,"overrides_lines":0,"state_yaml":false,"pre_design":false}\n'
  exit 3
fi

# --- Step 1: 处理 archive 目录冲突 -------------------------------------------
if [ -d "$ARCHIVE_DIR" ]; then
  case "$CONFLICT_MODE" in
    --overwrite)
      rm -rf "$ARCHIVE_DIR"
      ;;
    --suffix)
      SUFFIX=$(date -u +%s 2>/dev/null || date +%s)
      mv "$ARCHIVE_DIR" "${ARCHIVE_DIR}_${SUFFIX}"
      ;;
    --skip)
      echo "[harness-sync] archive 目录已存在,用户选择跳过" >&2
      printf '{"metrics_files":0,"overrides_lines":0,"state_yaml":false,"pre_design":false}\n'
      exit 2
      ;;
    *)
      echo "[harness-sync] archive 目录已存在: $ARCHIVE_DIR — 需主代理交互决定" >&2
      exit 2
      ;;
  esac
fi

mkdir -p "$ARCHIVE_DIR"

# --- 计数器 -------------------------------------------------------------------
METRICS_COUNT=0
OVERRIDES_LINES=0
HAS_STATE=false
HAS_PREDESIGN=false
FAILURES=0

# --- Step 2: 合回 metrics (仅顶层聚合,archive 不再存副本) --------------------
# 单 change 追溯通过 metrics JSON 内的 change_id 字段从顶层查询即可
if [ -d "$WORKTREE_HARNESS/metrics" ]; then
  mkdir -p "$ORIGIN_HARNESS/metrics"

  for f in "$WORKTREE_HARNESS/metrics/"*-metrics.json; do
    [ -f "$f" ] || continue
    fname="$(basename "$f")"

    # 顶层聚合(no-clobber)
    if ! cp -n "$f" "$ORIGIN_HARNESS/metrics/$fname" 2>/dev/null; then
      if [ ! -f "$ORIGIN_HARNESS/metrics/$fname" ]; then
        echo "[harness-sync] FAIL: cp $f → $ORIGIN_HARNESS/metrics/$fname" >&2
        FAILURES=$((FAILURES + 1))
      fi
    fi

    METRICS_COUNT=$((METRICS_COUNT + 1))
  done
fi

# --- Step 3: 合回 overrides.log (追加顶层 + archive 副本) --------------------
if [ -f "$WORKTREE_HARNESS/overrides.log" ]; then
  if cat "$WORKTREE_HARNESS/overrides.log" >> "$ORIGIN_HARNESS/overrides.log" 2>/dev/null; then
    OVERRIDES_LINES=$(wc -l < "$WORKTREE_HARNESS/overrides.log" 2>/dev/null | xargs)
  else
    echo "[harness-sync] FAIL: append overrides.log → $ORIGIN_HARNESS/overrides.log" >&2
    FAILURES=$((FAILURES + 1))
  fi

  if ! cp "$WORKTREE_HARNESS/overrides.log" "$ARCHIVE_DIR/overrides.log" 2>/dev/null; then
    echo "[harness-sync] FAIL: cp overrides.log → $ARCHIVE_DIR/overrides.log" >&2
    FAILURES=$((FAILURES + 1))
  fi
fi

# --- Step 4: 合回 state.yaml 终态 --------------------------------------------
if [ -f "$WORKTREE_HARNESS/changes/$CHANGE_ID/state.yaml" ]; then
  if cp "$WORKTREE_HARNESS/changes/$CHANGE_ID/state.yaml" "$ARCHIVE_DIR/state.yaml" 2>/dev/null; then
    HAS_STATE=true
  else
    echo "[harness-sync] FAIL: cp state.yaml → $ARCHIVE_DIR/state.yaml" >&2
    FAILURES=$((FAILURES + 1))
  fi
fi

# --- Step 5: 合回 pre_design.md -----------------------------------------------
if [ -f "$WORKTREE_HARNESS/changes/$CHANGE_ID/pre_design.md" ]; then
  if cp "$WORKTREE_HARNESS/changes/$CHANGE_ID/pre_design.md" "$ARCHIVE_DIR/pre_design.md" 2>/dev/null; then
    HAS_PREDESIGN=true
  else
    echo "[harness-sync] FAIL: cp pre_design.md → $ARCHIVE_DIR/pre_design.md" >&2
    FAILURES=$((FAILURES + 1))
  fi
fi

# --- 输出 JSON 汇总 -----------------------------------------------------------
printf '{"metrics_files":%d,"overrides_lines":%d,"state_yaml":%s,"pre_design":%s}\n' \
  "$METRICS_COUNT" "$OVERRIDES_LINES" "$HAS_STATE" "$HAS_PREDESIGN"

# --- 退出码 -------------------------------------------------------------------
if [ "$FAILURES" -gt 0 ]; then
  echo "[harness-sync] 完成,但有 $FAILURES 项拷贝失败(partial_failure)" >&2
  exit 1
fi

exit 0
