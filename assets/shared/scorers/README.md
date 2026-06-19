# easy-flow scorers — 算法说明与边界

5 个 scorer 脚本驻留在本目录,由 `audit` skill 统一调度。每个脚本 stdout 输出一行 JSON:

```
{"scorer":"<name>","score":<0-100>,"reason":"<text>"}
```

- 分越高越好
- `reason` 字段是人类可读的简要解释,部分 scorer 还会带 `source=<...>` 方便追溯数据来源
- 退出码不参与评分,失败时 fallback 到一个保守默认值(各 scorer 有差异)

## scorer 一览

| scorer | 默认权重 | 数据源 | 失真度 |
|---|---|---|---|
| `audit-violation-rate` | 1.0 | 上一轮 audit 写入的 `audit.violations / audit.total_checks` | 低(基于显式审计结果) |
| `constitution-violation-count` | 1.0 | Constitution 合规检查的违规计数 | 低 |
| `test-coverage` | 1.0 | **优先**真实覆盖率报告;**兜底**文件名启发式 | **高(启发式时不准,见下文)** |
| `complexity` | 1.0 | `find -name *.{ts,js,py,go,rs}` 中超过 300 行的文件数 | 中(只看行数,不看圈复杂度) |
| `doc-sync` | 1.0 | `CHANGELOG.md` / `README.md` 是否存在 + 最近 10 commit 是否有 docs 类提交 | 中(只看头/尾信号) |

权重在 `.harness/harness.toml: [scorer.weights]` 中可自定义。设为 0 可彻底排除该 scorer 出 `overall_score`。

---

## test-coverage:边界与建议

`test-coverage-scorer.sh` 的探测顺序(优先级从高到低):

1. `coverage/coverage-summary.json` — Istanbul JSON(jest / vitest / c8 / nyc)
2. `coverage/lcov.info` — lcov 通用格式(Rust tarpaulin / llvm-cov / 跨语言)
3. `coverage.xml` — Cobertura(Python `coverage.py` / .NET coverlet)
4. `target/site/jacoco/jacoco.xml` — Jacoco(Java / Kotlin)
5. **(兜底)文件名启发式** — `TEST_COUNT / IMPL_COUNT * 100`

### ⚠️ 启发式不准的 4 个原因

如果项目里**没有**上面 1~4 任一格式的覆盖率报告,scorer 会回退到第 5 步的文件名启发式。这种估算**不可信**,典型失真:

1. **集成测试 N→1 不可见**:一个 `cypress/e2e/checkout.spec.ts` 实际跑过 50 个 src 文件,但只算 1 个测试文件 → raw 比例严重低估
2. **命名约定狭窄**:只识别 `*.test.* / *.spec.* / test_*`;Go `_test.go`、Java `*Test.java`、C# `*Tests.cs`、Python `tests/test_*.py` 等命名**全部漏认**,IMPL=高 + TEST=0 → 直接判 25 分误杀
3. **覆盖深度不可见**:文件 A 90% 行覆盖 vs 文件 B 5% 行覆盖,scorer 看不到差异——只看"两个文件都有对应 test 文件"
4. **数量 ≠ 质量**:一个空测试文件和一个跑 50 个有断言 case 的测试文件,在 scorer 眼中等价

### 推荐:接入标准覆盖率工具

**强烈建议**在 `/ezfl:audit` 之前,先用项目所属生态的标准覆盖率工具产出报告。常用命令:

| 生态 | 命令 | 产物 |
|---|---|---|
| **JS/TS** (vitest) | `vitest run --coverage` | `coverage/coverage-summary.json` + `lcov.info` |
| **JS/TS** (jest) | `jest --coverage` | `coverage/coverage-summary.json` + `lcov.info` |
| **JS/TS** (c8/nyc) | `c8 --reporter=json-summary --reporter=lcov npm test` | `coverage/coverage-summary.json` + `lcov.info` |
| **Python** (pytest-cov) | `pytest --cov --cov-report=xml` | `coverage.xml` |
| **Python** (coverage.py) | `coverage run -m pytest && coverage xml` | `coverage.xml` |
| **Go** | `go test -coverprofile=coverage.out ./... && gocov convert coverage.out \| gocov-xml > coverage.xml` | `coverage.xml`(经 gocov 转换) |
| **Rust** | `cargo tarpaulin --out Lcov` | `coverage/lcov.info`(或 `lcov.info`,看版本) |
| **Rust** (llvm-cov) | `cargo llvm-cov --lcov --output-path coverage/lcov.info` | `coverage/lcov.info` |
| **Java/Kotlin** (Maven) | `mvn test jacoco:report` | `target/site/jacoco/jacoco.xml` |
| **Java/Kotlin** (Gradle) | `./gradlew test jacocoTestReport` | `build/reports/jacoco/test/jacocoTestReport.xml`(需要软链接到默认路径,或自定义后续支持) |
| **.NET** (coverlet) | `dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura` | `coverage.cobertura.xml`(重命名/移动到 `coverage.xml`) |

### MCP 集成思路

在 CI 或本地开发流中通过**测试 / 覆盖率 MCP server**自动产生上述报告再触发 `/ezfl:audit`,可让本 scorer 始终走真实数据路径。具体接入由项目侧决定——本 scorer 只声明它认识的报告格式与位置;**只要文件按上述路径放好,就自动命中**。

---

## complexity:边界

只看"行数 > 300 的文件数",不看圈复杂度、嵌套深度、cognitive complexity。改进路径(未来):接入 `radon` (Python) / `eslint --rule complexity` (JS/TS) / `gocyclo` (Go) 等工具的输出。

## doc-sync:边界

启发式三档(`CHANGELOG.md` / `README.md` 存在性 + 最近 10 commit 是否有 docs 提交)。不能识别"代码变了但文档没跟上"这种语义级失同步——这需要更复杂的 diff 分析,留作未来增量。

## audit-violation-rate / constitution-violation-count

这两个 scorer 读最近一次 audit 的 metrics JSON,把违规率换算成分数。它们是**单源**评分(只看 audit 自身的输出),不引入额外失真;数据可信度等于上游 audit 步骤本身的可信度。

---

## 添加新 scorer

新增脚本放在本目录,文件名 `<name>-scorer.sh`(或与现有命名对齐——audit / constitution / doc-sync 等没有 `-scorer` 后缀,这是历史遗留,不强制),并:

1. 在 `skills/audit/SKILL.md` Step 2 的循环里登记脚本名
2. stdout **必须**输出 `{"scorer":"<name>","score":<0-100>,"reason":"<text>"}`
3. 在 `templates/harness.example.toml` 的 `[scorer.weights]` 段加默认权重(通常 1.0)
4. 在本 README 的"scorer 一览"表里追加一行,标明数据源与失真度
