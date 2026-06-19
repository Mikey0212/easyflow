#!/usr/bin/env bash
# tasks-lint.sh — tasks.md 格式合规检查
#
# 由 propose Step 4 调用,作为 propose 准出规则。
# 检查 tasks.md 是否含禁止内容(Constitution Audit / git commit /
# superpowers header / 内嵌代码过多 / 缺 DocSync)。
#
# 用法: bash tasks-lint.sh <tasks.md路径>
# 退出码: 0=通过, 1=有违规
# stdout: JSON 一行 {"pass":true/false,"violations":[...]}
set -uo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo '{"pass":false,"violations":["文件不存在或路径为空: '"${FILE:-<empty>}"'"]}'
  exit 1
fi

VIOLATIONS=()

# --- 1. 含 Constitution Compliance Audit / Constitution.*Audit ---
if grep -qiE "Constitution\s*(Compliance\s*)?Audit" "$FILE" 2>/dev/null; then
  VIOLATIONS+=("含 Constitution Audit 任务组(应由 /ezfl:audit 阶段处理)")
fi

# --- 2. 含 git commit / git add 步骤(排除 Documentation Sync 节内) ---
# 策略:提取 Documentation Sync 节之前的内容,检查是否有 git commit/add
DOC_SYNC_LINE=$(grep -n -i "Documentation Sync" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
if [ -n "$DOC_SYNC_LINE" ]; then
  CHECK_RANGE="1,${DOC_SYNC_LINE}"
else
  CHECK_RANGE="1,$"
fi
if sed -n "${CHECK_RANGE}p" "$FILE" | grep -qE "^\s*git\s+(commit|add)" 2>/dev/null; then
  VIOLATIONS+=("含 git commit/add 步骤(应由 /ezfl:ship 阶段处理)")
fi

# --- 3. 含 superpowers 执行入口 header ---
if grep -qiE "For agentic workers|REQUIRED SUB-SKILL|superpowers:executing-plans|superpowers:subagent-driven-development" "$FILE" 2>/dev/null; then
  VIOLATIONS+=("含 superpowers 执行入口 header(应使用 easy-flow 标准格式)")
fi

# --- 4. 代码块总行数 > 总行数 40% ---
TOTAL_LINES=$(wc -l < "$FILE" | xargs)
CODE_LINES=$(awk '/^```/{in_code=!in_code; next} in_code{n++} END{print n+0}' "$FILE" 2>/dev/null)
if [ "$TOTAL_LINES" -gt 0 ] && [ "$CODE_LINES" -gt 0 ]; then
  RATIO=$(( (CODE_LINES * 100) / TOTAL_LINES ))
  if [ "$RATIO" -gt 40 ]; then
    VIOLATIONS+=("代码块占比 ${RATIO}%(>${TOTAL_LINES}行的40%),内嵌代码过多")
  fi
fi

# --- 5. 缺少 Documentation Sync 末位任务组 ---
if ! grep -qiE "Documentation Sync" "$FILE" 2>/dev/null; then
  VIOLATIONS+=("缺少 Documentation Sync 末位任务组")
fi

# --- 6. TDD 任务必须含 5 步子任务(N.M.1~N.M.5 缩进子步骤) ---
# 找到所有标注 <!-- TDD 任务 --> 的行,检查其后是否有三级编号子步骤
TDD_TASKS=$(grep -n "<!-- TDD" "$FILE" 2>/dev/null | cut -d: -f1)
if [ -n "$TDD_TASKS" ]; then
  MISSING_SUBSTEPS=0
  while IFS= read -r LINE_NUM; do
    [ -z "$LINE_NUM" ] && continue
    # 从 TDD 注释行往下 30 行内搜索三级编号(如 1.1.1 / 2.3.5)
    HAS_SUBSTEP=$(sed -n "$((LINE_NUM)),$(( LINE_NUM + 30 ))p" "$FILE" | grep -cE "^\s*-\s*\[[ x]\]\s*[0-9]+\.[0-9]+\.[0-9]+" 2>/dev/null)
    HAS_SUBSTEP="${HAS_SUBSTEP:-0}"
    HAS_SUBSTEP=$(echo "$HAS_SUBSTEP" | tr -d '[:space:]')
    if [ "$HAS_SUBSTEP" -lt 3 ] 2>/dev/null; then
      MISSING_SUBSTEPS=$((MISSING_SUBSTEPS + 1))
    fi
  done <<< "$TDD_TASKS"
  if [ "$MISSING_SUBSTEPS" -gt 0 ]; then
    VIOLATIONS+=("${MISSING_SUBSTEPS} 个 TDD 任务缺少 5 步子任务结构(N.M.1~N.M.5)")
  fi
fi

# --- 输出 JSON ---
COUNT=${#VIOLATIONS[@]}
if [ "$COUNT" -eq 0 ]; then
  echo '{"pass":true,"violations":[]}'
  exit 0
else
  # 构建 JSON 数组
  JSON_ARR="["
  for i in "${!VIOLATIONS[@]}"; do
    [ "$i" -gt 0 ] && JSON_ARR+=","
    # 转义双引号
    V="${VIOLATIONS[$i]//\"/\\\"}"
    JSON_ARR+="\"$V\""
  done
  JSON_ARR+="]"
  echo "{\"pass\":false,\"violations\":${JSON_ARR}}"
  exit 1
fi
