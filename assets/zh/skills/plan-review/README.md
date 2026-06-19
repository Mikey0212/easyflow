# plan-review

> 工程经理模式的计划/提案评审 skill。在编码前**锁定架构、数据流、测试覆盖、性能**——以"找漏洞而非走过场"为目标。

## 用法

| 触发方式 | 说明 |
|---|---|
| easy-flow lock 链 | 用户执行 `/ezfl:lock` → `commands/lock.md` adapter 自动 `use_skill("easy-flow:plan-review")`，产出 `openspec/changes/<name>/review-report.md` |
| 独立调用 | 用户在对话中要求"评审架构"、"工程评审"、"锁定计划"、"review architecture"、"lock in the plan"、"tech review"、"plan engineering review" 等关键词；用户在对话中显式列出待评审文档路径 |
| Proactive 建议 | 描述了一个非平凡变更（>3 文件、新增组件、跨模块改动）且明显在编码前阶段时，本 skill 主动建议运行 |

完整执行流程入口见 [`SKILL.md`](./SKILL.md)。

## 文件结构

```
plan-review/
├── SKILL.md                                    主入口（流程总览 + HARD-GATE + Agent Selection）
├── README.md                                   本文件
├── config.example.yaml                         配置模板（缺失则全部走默认）
│
├── policies/                                   流程详细规则（被 SKILL.md 顺序调用）
│   ├── scope-challenge.md                      Step 0：范围挑战 6 子节
│   ├── four-section-review.md                  Section 1-4：架构/代码/测试/性能
│   └── outside-voice.md                        Outside Voice：启动/输入/门禁/用户主权
│
├── references/                                 参考资料（按需查阅）
│   ├── caller-contract.md                      调用方输入/输出/修改约束契约
│   ├── engineering-mindset.md                  工程偏好 + 15 条认知模式
│   ├── test-review-methodology.md              测试评审 7 步法详解
│   ├── output-format.md                        输出风格 + 必需输出格式 + Escalation
│   └── host-adapters.md                        各宿主 subagent 启动方式
│
├── agents/
│   └── cross-review-agent.md                   Outside Voice 用的交叉评审 subagent
│
└── prompts/
    └── main-review-summary.tmpl.md             喂给 challenger 的输入模板
```

## 跨宿主支持

本 skill **要求宿主支持 subagent 派发能力**（CodeBuddy `task` / Claude Code `Task` / 其它兼容宿主）。

不支持 subagent 的宿主**直接跳过** Outside Voice 节并在报告中标注 `Outside Voice: not run (host lacks subagent capability)`——**不再支持 inline 降级**（同 context 注入 challenger prompt 的独立性已被实证不可靠，效果优先原则下宁可不跑也不假跑）。具体宿主适配见 `references/host-adapters.md`。

## 配置

拷贝 `config.example.yaml` 为项目根 `config.yaml` 修改。缺失视为全部使用默认值，跳过加载并在报告开头记一行"使用默认配置"。

可配置项摘要：

- `challenger.enabled` — 是否启用 Outside Voice，默认 `true`
- `challenger.model` — challenger subagent 使用的模型，留空 = 宿主默认
- `challenger.prompt_mode` — `always_ask`（默认） / `auto_run` / `never`
- `challenger.share_user_decisions` — 是否把用户决策喂给 challenger，默认 `false`（最大化独立性）
- `scope_challenge.max_files` — 复杂度阈值（文件数），默认 `8`
- `scope_challenge.max_new_services` — 复杂度阈值（新类/新服务数），默认 `2`

完整字段定义见 `config.example.yaml` 自带注释。
