#!/usr/bin/env bash
# constitution-validity.sh — 宪法有效性判定
# 退出码: 0=有效, 1=无效(含占位符), 2=不存在
set -uo pipefail

# 读取配置路径（默认）
CONSTITUTION_PATH="${CONSTITUTION_PATH:-openspec/memory/constitution.md}"

# 检查文件是否存在
if [ ! -f "$CONSTITUTION_PATH" ]; then
  exit 2
fi

# 检查是否含未替换的占位符 [ALL_CAPS_PLACEHOLDER]
if grep -qE '\[[A-Z][A-Z_]+\]' "$CONSTITUTION_PATH"; then
  exit 1
fi

# 检查是否有 Core Principles 节
if ! grep -q "## Core Principles" "$CONSTITUTION_PATH"; then
  exit 1
fi

# 检查是否有版本号
if ! grep -qE "^\*\*Version\*\*:" "$CONSTITUTION_PATH"; then
  exit 1
fi

# 所有检查通过
exit 0
