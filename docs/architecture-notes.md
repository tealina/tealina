# tealina 项目理解笔记

这份笔记和 [architecture.md](./architecture.md) 是**两种不同的东西**，不重复：

- `architecture.md` 是**描述性**的——按子系统逐块讲清「它是什么、在哪、怎么跑」。
- 这份是**判断性**的——只记读完之后留在脑子里的模型：什么是这套代码的「合规矩」、哪里
  藏着会静默失效的耦合、哪些东西不能顺手改、以及 CI 兜不住什么。
- 按日期记录的来历在 [history.md](./history.md)。

需要查具体实现去看前者；需要判断一个改动会不会踩雷，看这份。

---

## 1. 三句话的模型

**一句话**：把「目录树 + handler 的类型注解」当成单一真相源，从它派生三样本来要手写三遍
的东西——运行时路由、客户端类型、API 文档。

**一个不变量**：任何时候都不该出现第二份需要手工同步的真相。聚合用的 `index.ts` 是派生物
（所以有 `align` 重建它）；`alias.d.ts` 是唯一的框架接缝（所以 `handler.d.ts` 不随框架变）。

**一个核心手法**：把「位置」编码进类型。handler 是**数组**而不是函数，`ExtractApiType` 靠
`LastElement` 取最后一元素来跳过中间件；`access/index.ts` 的
`<const T extends [...Middleware[], OpenHandler<AnyPayload, any>]>`（fastify 那版末位退到
`CustomHandlerType`）元组泛型靠**最后一个位置**来校验类型。整套中间件机制都建立在「数组的
位置有意义」这一条上。

---

## 2. 改动的判准

判断一个改动是否「合规矩」，问五个问题：

1. **它会不会引入第二份真相？**（会 → 大概率方向错了）
2. **它走 `Snapshot` 通道了吗？** `packages/tealina` 的所有落盘只应经过
   `utils/effectFiles.ts`。绕开它直接 `writeFile` 就破坏了「生成 = 幂等纯函数」这个性质。
3. **重跑还是 no-op 吗？** `changedOnly` 会丢弃 `code == null` 的 update，这正是重跑安全
   的来源。新增生成行为必须保持这一点，`--check` 也必须走同一批快照。
4. **生成物带标记头了吗？** 每个生成文件都以 `kGeneratedHeader` 开头。新生成器（或新的
   输出文件）要复用这个常量，而不是另写一行注释。
5. **它有没有碰上下面那张耦合表？**

---

## 3. 耦合地图（最容易踩的地方）

这张表是这份笔记最主要的价值。左边是「你要改的东西」，右边是「必须同时看的东西」——
**右列的任何一项对不上时，几乎都不报错**。

| 改什么 | 必须同时检查 | 失效方式 |
|---|---|---|
| handler 的形状 / 命名 | `types/handler.d.ts`、三个框架各自的 `types/alias.d.ts`、`types/api.d.ts`、`access/index.ts` 的元组泛型 | 类型层面**静默**：项目照样编译，只是契约不再是那份契约 |
| 响应包装（`WithExtra` 等） | `utility-types` **＋** `utils/parseDeclarationFile.js` 里识别 `__@ResponseFlagSymbol` 的**正则** | 类型层 ↔ 解析层之间是**字符串约定而非类型约定**，改名不会让任何编译失败，只会让文档生成悄悄退化 |
| `MultiTarget` 各投影语义 | `handler.d.ts` 的投影点 | 未标记类型原样透传、**不支持嵌套**——一嵌套就静默退化成透传 |
| `apiDir` / `apiBaseURL` | `api-v1/version.js`、`tealina.config`、`api-v1/src/mount`、`api-v1/src/doc`、web 的 `vite.config` | 公开产物已固定名字（`types/api.d.ts`、`docs/api.json`、`exports["./api"]`），所以改目录名只影响发现路径。URL 前缀已经收敛到 `version.js` 一处，但改它之后要重跑 `gdoc`，文档里的 `servers` 才会更新 |
| 加包 / 改包名 | `scripts/update-version-in-template.mjs` 的 `TEMPLATE_TREES` 与四个 `latest*` 列表、模板三个后端包与 web 的 `package.json`、根 `pnpm-workspace.yaml` 的 `overrides` | 脚本只改模板里**已经声明**的依赖键；新增包没有加进 `TEMPLATE_TREES`、或新依赖没有进 `latest*` 列表时，模板会静默停在旧版本 |
| `tealina` 的构建配置 | bin shim 引用的 `dist/` **深路径** | 它是 tsdown 的 `unbundle` **1:1 不打包**模式，改成打包会打断 bin shim |
| `create-tealina/template/**` | 三个后端包 × 六棵树（3 框架 × ts/js）、web 树与 `src/template-manifest.ts` | 改一个框架容易忘另外五个。`test/template-parity.test.ts` 约束文件集合、api/access 布局与包间依赖方向；`test/template-manifest.test.ts` 约束 manifest、每个文件的目的包与 import 解析 |

---

## 4. 公开 API 的拼写修复

拼写错误**可以修**，但修法取决于它是什么：

| 种类 | 修法 | 例子 |
|---|---|---|
| 公开类型名 | 新声明承接，旧名降为带 `@deprecated` 的 type 别名 | `TealinaConfig` / `MatchForOptionalCheck` |
| 配置属性键 | 两个键都读，新键优先，旧键 `consola.warn` 一次 | `transformType` 优先，`transofrmType` 仍生效 |
| 内部名字 | 直接改，不留别名 | `BasicRouteOption`、`getTestHelperPath` |

判据不是「它是不是拼错了」，而是**它有没有出现在用户会写的那份配置/类型里**。这个判据决定
用哪种修法，不决定改不改。

---

## 5. CI 兜不住什么

现在的测试分四层，其中三层默认会跑：

| 层 | 文件 | 覆盖 |
|---|---|---|
| T1 契约 | `test/contract.test.ts` | 拿 `template/**` 拼出 fixture 交给 `tsc`，包括 `core` 的 `paths` 接缝 |
| T3 e2e | `test/e2e*` | `TEALINA_E2E=1` 门控：真装、真构建三个包、真起服务、真发请求 |
| T4 manifest / parity | `test/template-manifest.test.ts`、`test/template-parity.test.ts` | 每个文件落在哪个包、每个 import 是否能在该包内解析；六棵树的结构与依赖方向 |
| 生成器快照 | `packages/tealina/test/**` | 生成字符串是否正确、`--check` 是否只在漂移时退出 1 |

仍然兜不住的两块：

1. **e2e 默认不跑。** 它依赖安装已发布（或 `file:` 覆盖）的包，成本高，所以只在显式设置
   `TEALINA_E2E=1` 时运行。改模板后本地跑一遍比看 CI 绿更有说服力。
2. **`align` 的类型文件兜底。** `types/api.d.ts` 已存在时 `align` 不重写它，`--check` 也
   看不见它。改契约层后如果需要重建，只能先删文件。见 `architecture.md` §10。

除此之外，「CI 绿了」已经能作为「生成出来的项目至少编译得通过」的证据——这一点和第一轮
审计时不同。

---

## 6. 对项目所处阶段的判断

设计已经定型：目录即路由表、带斜杠的扁平路由 key、`@tealina/doc-types` 不再被 re-export、
`create-tealina` 只有一个 `create` 入口、后端按 `core → api-v1 → server` 分成三个包、
模板由 manifest 和 parity 测试约束。当前是**稳定期**：三套框架模板的打磨、面向代理的可检查
反馈（`--check` / `--json` / 退出码 / 生成物标记头），几乎没有新功能。

`v1` 的深度耦合已经解开：`apiDir` 进了配置，公开产物改用固定名字，命令不再接收目录参数。
URL 前缀也收敛到了 `api-v1/version.js` 一处，配置、mount、doc 路由与前端 proxy 都读它。
多版本的挂载也已经有了约定：api 包只发布 `${API_BASE_URL}/_doc/api.json` 并在 `mount`
里返回 `docSource`，`server` 持有唯一的文档页、把各版本的 source 聚合成一个列表。
