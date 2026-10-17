# tealina 历史笔记

按日期记录**当时**的形态与决定，只为解释「为什么现在是这样」。当前形态见
[architecture.md](./architecture.md)，改动判准见 [architecture-notes.md](./architecture-notes.md)。

## 2026-09-18 — 第一轮仓库审计

`docs/architecture.md` 的初版。当时 `packages/create-tealina` 是**整包**脚手架（Prisma +
React + node/bun 双 runtime），lite 是并列的第二个包。

## 2026-09-22 — lite 接替名字，整包退役

lite 在 3.0.0 接替了 `create-tealina` 这个名字，整包退役并从仓库移除。当时按旧树写的
结论有几处主语失效：

- `types/common.d.ts` 里的 `ModelId` / `PageResult` 随整包退役。
- 模板的 axios 客户端换成 `@tealina/client` 的 `createFetchClient`，响应已拆包，不再有
  `.then(v => v.data)`。
- `init-demo.mjs`、deno runtime、`template-factory/`、`runScripts` 这些条目都属于整包；
  活跃的树里没有它们。
- 「brownfield 入口是空的」不再成立——`create-tealina init` 落地了，形态与当年的建议
  一致：独立包、一次性运行、不进入目标项目依赖、不猜入口文件、目的地先查重、写
  `exports["./api/v1"].types`。绿地与集成共用同一个包、同一套模板，所以当年担心的
  「契约层变两份」没有发生。
- 「没有任何测试真正编译过生成出来的项目」在活跃的树上反过来：T1 用模板拼出 fixture
  交给 `tsc`，T5 断言 `init` 之后宿主的源码能通过类型检查，T3 是 `TEALINA_E2E=1`
  门控的 e2e。原来的 T2 `contract-drift.test.ts` 随整包一起删除——它的立论是「两份
  逐字节一致的契约层」，第二份没有了。

## 2026-09-26 — 拼写修复与兼容策略

`TealinaConifg` / `MatchForOptionalChcek` / `transofrmType` 三个公开 API 的拼写修掉了，
而且没有破坏兼容：

- **类型名**用新声明承接，旧名降为带 `@deprecated` 的 type 别名。
- **属性键**（`transofrmType`）会被用户写进 `tealina.config.ts`，所以两个键都读：
  `transformType` 优先，旧键仍然生效但 `consola.warn` 一次。
- 内部的 `BasiRouteOption` / `getTestHeplerPath` 直接改名，没有留别名——深路径既不可达
  也没有声明文件。

结论不是「拼写不能修」，而是**判据决定用哪种修法**。

## 2026-10-08 — `src/api-v1` → `src/api/v1`

模板把 api 目录从 `src/api-v1` 改成 `src/api/v1`。六处绑在 `v1` 上的位置没有变少，变的是
前两处（`types/v1.d.ts`、`docs/v1.json`）现在与后四处拼成同一个字符串，模板自身不再
自相矛盾。

这一改还暴露了**第七处**，但它绑的不是 `v1` 而是 api 目录的**深度**：handler 模版拿到的
`relative2api` 是 `namePaths.length + 1` 个 `..`，那个 `+ 1` 就是「apiDir 占两段」的隐藏
假设。配置自己修不了它——它无从知道 apiDir 的深度，只有 CLI 知道。该字段已换成
`TemplateContext.fileDir`，深度由配置用 `posix.relative` 自算。

## 2026-10-17 — 第二轮审计：面向 AI 辅助开发

以下改动都针对同一个问题：机器可检查的反馈不够，代理只能靠读散文推断状态。

- **Node 上限与下限都升到 22**：`vite-plus-core` 的 tsdown 使用
  `Promise.withResolvers`，Node 20 上构建第一步就失败。CI、`engines`、`target`、
  `@types/node` 全部对齐到 22，并新增 `.nvmrc`。
- **失败真的退出 1**：`catchError` 以前只打印错误、退出码仍是 0；现在设置
  `process.exitCode = 1`。
- **`--check` / `--json`**：`align` 与 `gdoc` 可以只比较不写盘，漂移时退出 1，并用一个
  JSON 对象报告 `{ ok, changed }`。
- **生成物带标记头**：每个生成文件开头写明「不要手改」和重建命令，代理与人都能一眼
  分辨生成物与源码。
- **align 的兜底类型文件修好**：旧实现生成的是 `ResolveApiType` / `ApiTypesRecord`，
  两个名字在 `handler.d.ts` 里都不存在，也没有消费者。现在生成与模板一致的
  `ApiTypesForDoc` / `ApiTypesForClient`。
- **模板依赖注入重新接上**：`update-version-in-template.mjs` 只更新模板已经声明的依赖，
  一份列表覆盖六棵 server 树与 web。
- **`archive/` 移出仓库**：保留在仓库外的一份快照里，不再参与构建、lint 或发布。
- **新入口的说明**：模板里新增 `AGENTS.md`，仓库根也有一份。
