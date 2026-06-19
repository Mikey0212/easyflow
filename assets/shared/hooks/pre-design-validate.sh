#!/usr/bin/env bash
# hooks/pre-design-validate.sh — pre_design.md 完整性校验(machine-verified)
#
# 由 propose Step 2.2 调用,把 9 节必含清单从 SKILL.md 表格固化到脚本。
# 节名硬编码,与 templates/pre-design-template.md 同源。
#
# 用法:  bash pre-design-validate.sh <pre_design.md路径>
# 退出码:
#   0  完整(9 节齐)
#   1  文件不存在(stderr 提示)
#   2  缺节(stdout 输出 JSON: {"missing":["..."]},stderr 输出统一阻断话术)
#
# 阻断话术(与现状 propose Step 2.2 一致):
#   [easy-flow] 阻断：pre_design.md 不完整，缺失节 <X>，请回到 /ezfl:design 补齐。

set -uo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "[easy-flow] pre_design.md 不存在: ${FILE:-<empty>}" >&2
  exit 1
fi

# 必含节:每行一个 grep 模式(extended regex,行首 ##,可有任意空格)。
# 第 7 项二选一: "## 任务范围" 或 "## Scope"
declare -a REQUIRED=(
  '^##[[:space:]]+Reframe[[:space:]]*历程'
  '^##[[:space:]]+Constitution[[:space:]]+Alignment'
  '^##[[:space:]]+Premises'
  '^##[[:space:]]+Premise[[:space:]]+History'
  '^##[[:space:]]+Decisions'
  '^##[[:space:]]+Alternatives'
  '__SCOPE__'                                 # 占位,见下方专门处理
  '^##[[:space:]]+Open[[:space:]]+Questions'
  '^##[[:space:]]+下游约束'
)
declare -a LABELS=(
  '## Reframe 历程'
  '## Constitution Alignment'
  '## Premises'
  '## Premise History'
  '## Decisions'
  '## Alternatives'
  '## 任务范围 (或 ## Scope)'
  '## Open Questions'
  '## 下游约束'
)

MISSING=()
for i in "${!REQUIRED[@]}"; do
  pat="${REQUIRED[$i]}"
  label="${LABELS[$i]}"
  if [ "$pat" = "__SCOPE__" ]; then
    if ! grep -qE '^##[[:space:]]+(任务范围|Scope)' "$FILE" 2>/dev/null; then
      MISSING+=("$label")
    fi
  else
    if ! grep -qE "$pat" "$FILE" 2>/dev/null; then
      MISSING+=("$label")
    fi
  fi
done

if [ "${#MISSING[@]}" -eq 0 ]; then
  exit 0
fi

# 输出 JSON + 阻断话术
JSON='['
first=1
for m in "${MISSING[@]}"; do
  esc="${m//\"/\\\"}"
  if [ "$first" = "1" ]; then first=0; else JSON+=","; fi
  JSON+="\"$esc\""
done
JSON+=']'
echo "{\"missing\":$JSON}"
echo "[easy-flow] 阻断：pre_design.md 不完整，缺失节 ${MISSING[*]}，请回到 /ezfl:design 补齐。" >&2
exit 2
