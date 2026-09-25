# tealina 项目理解笔记

这份笔记和 [architecture.md](./architecture.md) 是**两种不同的东西**，不重复：

- `architecture.md` 是**描述性**的——按子系统逐块讲清「它是什么、在哪、怎么跑」，带 `file:line` 证据。
- 这份是**判断性**的——只记读完之后留在脑子里的模型：什么是这套代码的「合规矩」、哪里藏着会静默失效的耦合、哪些东西不能顺手改、以及 CI 兜不住什么。

需要查具体实现去看前者；需要判断一个改动会不会踩雷，看这份。

> **2026-09-22 追记。** 这份笔记写于 2026-09-18，当时 `packages/create-tealina` 是整包脚手架。
> 此后 lite 接替了名字（3.0.0），整包退役并归档到 `archive/create-tealina`。判断本身仍然成立，
> 但有三处的主语变了：
>
> - **§5「CI 兜不住什么」指的是整包。** 接替的包把生成物真的编译了——T1 拿模板拼出 fixture 并
>   交给 `tsc`，T5 断言 `init` 之后宿主的源码能通过类型检查，另有 `TEALINA_E2E=1` 门控的 e2e
>   真装真跑真发请求。所以「没有任何测试真正编译过生成出来的项目」在活跃的树上是反的。
> - **§6 说的 brownfield 入口**已经落地为 `create-tealina init`，形态与那里的建议一致。
> - **§6 末尾担心的「契约层变两份」**没有发生——只有一个包、一套模板。

---

## 1. 三句话的模型

**一句话**：把「目录树 + handler 的类型注解」当成单一真相源，从它派生三样本来要手写三遍的东西——运行时路由、客户端类型、API 文档。

**一个不变量**：任何时候都不该出现第二份需要手工同步的真相。聚合用的 `index.ts` 是派生物（所以有 `-a` 重建它）；`alias.d.ts` 是唯一的框架接缝（所以 `handler.d.ts` 不随框架变）。

**一个核心手法**：把「位置」编码进类型。handler 是**数组**而不是函数，`ExtractApiType` 靠 `LastElement` 取最后一元素来跳过中间件；`convention.ts` 的 `<const T extends [...Middleware[], CustomHandlerType]>` 元组泛型靠**最后一个位置**来校验类型。整套中间件机制都建立在「数组的位置有意义」这一条上。

---

## 2. 改动的判准

判断一个改动是否「合规矩」，问四个问题：

1. **它会不会引入第二份真相？**（会 → 大概率方向错了）
2. **它走 `Snapshot` 通道了吗？** `packages/tealina` 的所有落盘只应经过 `utils/effectFiles.ts`。绕开它直接 `writeFile` 就破坏了「生成 = 幂等纯函数」这个性质。
3. **重跑还是 no-op 吗？** `changedOnly` 会丢弃 `code == null` 的 update，这正是重跑安全的来源。新增生成行为必须保持这一点。
4. **它有没有碰上下面那张耦合表？**

---

## 3. 耦合地图（最容易踩的地方）

这张表是这份笔记最主要的价值。左边是「你要改的东西」，右边是「必须同时看的东西」——**右列的任何一项对不上时，几乎都不报错**。

| 改什么 | 必须同时检查 | 失效方式 |
|---|---|---|
| handler 的形状 / 命名 | `types/handler.d.ts`、三个框架各自的 `types/alias.d.ts`、`types/api-v1.d.ts`、`convention.ts` 的元组泛型 | 类型层面**静默**：项目照样编译，只是契约不再是那份契约 |
| 响应包装（`WithExtra` 等） | `utility-types` **＋** `utils/parseDeclarationFile.js` 里识别 `__@ResponseFlagSymbol` 的**正则** | 类型层 ↔ 解析层之间是**字符串约定而非类型约定**，改名不会让任何编译失败，只会让文档生成悄悄退化 |
| `MultiTarget` 各投影语义 | `handler.d.ts` 的投影点 | 未标记类型原样透传、**不支持嵌套**——一嵌套就静默退化成透传 |
| api 目录名 / `v1` 标签 | `types/<basename>.d.ts`、`exports["./api/v1"].types`、三个 doc 路由的 `docs/api-v1.json`、vdoc 的 `baseURL`/`jsonURL`/`name`、`gdoc` 输出名、`convertToOpenApiJson` 的默认 `prefix` | 至少六处绑在 `v1` 上，改一处漏五处 |
| 加包 / 改包名 | `create-tealina/template/versionMaps.json`、根 `pnpm-workspace.yaml` 的 `overrides` | `update-version-in-template.mjs` 对没有 `packages/<name>` 的 key **直接 throw**；漏改 overrides 则内部包解析不到 |
| `tealina` 的构建配置 | bin shim 引用的 `dist/` **深路径** | 它是 unbuild 的 mkdist **1:1 不打包**模式，改成打包会打断 bin shim |
| `create-tealina/template/**` | ——（**没有任何保护**，见第 5 节） | 见第 5 节。**2026-09-22：这行已过时**——T1/T5 会把模板拼成 fixture 真编译，见第 5 节追记 |

---

## 4. 不要顺手改的东西

有一批拼写错误看起来是零成本修复，但**其中三个是已发布的公开 API 名**，改名即破坏性变更：

| 名字 | 位置 | 能不能改 |
|---|---|---|
| `TealinaConifg` | `packages/tealina/src/index.ts:166`，`defineConfig` 的签名用它 | ❌ 公开 API |
| `MatchForOptionalChcek` | 同上 `:52`，出现在公开的 `gtype.overwrite` 配置里 | ❌ 公开 API |
| `transofrmType` | 同上 `:66`，同上 | ❌ 公开 API |
| `BasiRouteOption` | `packages/tealina-server/src/transformToRouteOptions.ts:32` | ✅ **未 export**，模块内部类型 |
| `getTestHeplerPath` | `packages/tealina/src/commands/capi.ts:324` | ✅ 内部函数（`tealina` 发布的 `.d.ts` 只以 `src/index.ts` 为根，深路径根本没有声明文件） |

判据不是「它是不是拼错了」，而是**它有没有出现在用户会写的那份配置/类型里**。

**2026-09-26 追记：上面三行 ❌ 已经修好了，而且是兼容修法。**「不能直接改名」被当成了
「不能修」，这一步跳得太快——公开 API 有两种东西，改法不同：

- **类型名**（`TealinaConifg`、`MatchForOptionalChcek`）是结构性的，所以新名用原声明
  承接，旧名降为带 `@deprecated` 的 type 别名。外部配置一行不用改，新写的人看到的是
  正确拼写。
- **属性键**（`transofrmType`）是真会被用户写进 `tealina.config.ts` 的，所以两个键都读：
  新增 `transformType` 并优先，`transofrmType` 仍然生效但会 `consola.warn` 一次
  （`commands/gtype.ts` 的 `pickTypeTransforms`）。
- 两个 ✅ 的直接改名，没有留别名：`BasiRouteOption` → `BasicRouteOption`，
  `getTestHeplerPath` → `getTestHelperPath`（深路径既不可达也没有声明文件）。

所以真正要守的是**那条判据的用法**：判据决定「用哪种修法」，不决定「改不改」。
`docs/architecture.md` 里的两个旧名也一并换掉了。

---

## 5. CI 兜不住什么

`archive/create-tealina/test/helper.ts` 里的 `runScripts`（本应跑 `pnpm install` → `prisma db push` → `v1 gtype` → `v1 get/status` → `v1 gdoc` → `tsc --noEmit`）是**注释掉的**，`validate()` 只断言目录和 `package.json` 存在。

也就是说：**没有任何测试真正安装、编译或启动过一个生成出来的项目。** `packages/tealina` 的测试是生成器的快照测试，验的是「生成字符串对不对」，不是「生成出来的东西能不能跑」。

这一点和 git 历史对得上——最近一长串 commit 是 `fix: incorrect server template`、`init-demo` 连修三次、`fix: env load and sqlite init` 这类模板修复。**这些 bug 全都是 CI 绿着的时候存在的。**

结论：改 `template/**` 之后，CI 变绿不构成任何证据，必须人工生成一个项目实跑一遍。`temp/` 下堆积的历史生成物可以拿来对照。

结论：改 `template/**` 之后，CI 变绿不构成任何证据，必须人工生成一个项目实跑一遍。`temp/` 下堆积的历史生成物可以拿来对照。

**2026-09-22 追记：这条结论在活跃的树上不再成立，但只放宽到「编译」为止。** 接替的包有五层测试，
其中四层还会跑：T1（`test/contract.test.ts`）拿 `template/**` 拼出 fixture 交给 `tsc`，T4
（`init-manifest.test.ts`）断言 `init` 会写哪些文件，T5（`init.test.ts`）在 `init` 之后编译宿主的
源码，T3 是 `TEALINA_E2E=1` 门控的 e2e——真装、真起服务、真发请求。（原来的 T2
`contract-drift.test.ts` 随整包归档一起删了：它的立论是「两份逐字节一致的契约层」，第二份没了。）

---

## 6. 我对项目所处阶段的判断

2.0 那次重写已经把设计定型了——目录即路由表、带斜杠的扁平路由 key、`@tealina/doc-types` 不再被 re-export、Prisma 7 支持、`create-tealina` 作为唯一的绿地入口。此后到现在是**稳定期**：Express/Fastify/Koa 三套模板的打磨 + Prisma 7 迁移的收尾 + doc-ui 的样式微调，几乎没有新功能。

`docs/architecture.md` 这次审计里最有指向性的一条，是 §11 关于**再加一个 brownfield（集成进已有项目）入口、独立成 `create-*` 包**的讨论。我同意那个结论：它不该是 `tealina` 的子命令（上次 `tealina init` 被移除的三个原因——先有鸡还是先有蛋、在已有项目上静默跳过、不写 `exports["./api/v1"].types`——都是子命令形态的固有问题），而应该是一次性运行、用完即走、不进目标项目依赖的独立包。

随之而来的第一个真问题是 §11 提的**契约层单一来源**：`types/{handler,alias,common}.d.ts` 现在只有 `template/` 一份物理副本，一旦第二个入口自带模板就变成两份，而两份必须逐字节一致——否则两个入口产出的项目会以**不同的方式**通过类型检查，这类错误在类型层面完全静默。这个问题应该在写第二个入口**之前**解决，而不是之后。
