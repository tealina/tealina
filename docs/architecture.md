# tealina 架构与实现理解

> 本文全部基于直接读源码得到的事实，附 `file:line`，供讨论时对齐认知用。
> 最后一节「已发现的问题」与「开放问题」是讨论的入口。

## 1. 产品定位

一句话：**用类型标注代替手写路由表和接口文档的自动化工具链**。仓库根 README 的自我描述是 "The Full-Stack Automation Kit: Code Gen CLI, Interactive Docs & Type-Safe Client"，副标题是 "No Framework Left Behind: Seamless E2E Types for Express, Fastify, and Koa with **Minimal Changes**"。

关键点在于 "Minimal Changes"——它不接管你的应用，只接一行挂载代码。这决定了整个设计取向。

## 2. 仓库结构

pnpm monorepo（`pnpm-workspace.yaml` 只 glob `packages/*`，排除 `temp/**` 与 `temp-*`）。

| 包 | 角色 |
|---|---|
| `tealina` | CLI。`v1` 建 api、`-a` 对齐、`gtype` 生成纯净类型、`gdoc` 生成 OpenAPI JSON |
| `tealina-server` | 运行时核心。**只导出两个符号**：`loadAPIs` + `transformToRouteOptions`。**零依赖**，`package.json` 里既无 `dependencies` 也无 `peerDependencies` |
| `tealina-client` | 前端运行时。根导出 `createAxiosReq` / `createAxiosRPC` / `createFetchClient` / `createFetchRPC`，另有 `./axios` `./fetch` `./core` 子路径。`axios` 是 devDependency——实例由使用者注入。`MakeParameters`（`src/core/types.ts:49`）也在这一侧，**不在** `utility-types` |
| `utility-types` | 条件类型工具箱，单文件无运行时代码。`PickTarget` / `MultiTarget` / `ExtractResponse` / `Extract2xxResponse` / `Simplify` / `LastElement` / `WithExtra` / `DocDataKeys` 等 |
| `tealina-doc-types` | 文档数据结构的类型（`ApiDoc:180`、`DocKind:23`）。`DocDataKeys` 不在这里——它由 `utility-types:67` 定义，doc-types 只 import 使用、并未 re-export |
| `tealina-doc-ui` | 文档站点 UI（`assembleHTML`、`getAssetsPath`、`TealinaVdocWebConfig`）+ 其源码包 `tealina-doc-ui-src` |
| `create-tealina` | 绿地脚手架（bin-only，`npm create tealina`） |

`packages/tealina/package.json:43` 有 `peerDependencies: typescript >=5.6.2`——CLI 依赖 TS 做声明文件解析，这是它敢做端到端类型的原因。

**`@tealina/server` 只有两个导出**（`src/index.ts:1-2`），这是它最值得注意的地方——所有复杂度都在类型层，运行时极薄：

- `loadAPIs(apisV1)`（`resolveBatchExport.ts:42-48`）吃生成的 `index.ts`（两层懒加载 `import()`），`loadEachMethod`（`:26-37`）逐层 await 并取 `.default`，产出 `Record<method, Record<url, handlerFn>>`。类型侧由 `Obj2Map`/`Kind2Map`（`:1-7`）剥掉两层 `Awaited<...>['default']`，导出为 `ResolvedAPIs<HandlerType>`（`:11-14`）。
- `transformToRouteOptions`（`transformToRouteOptions.ts:41-49`）拍平成 `{method, url, handler}[]`（`BasiRouteOption<T>`，`:32-36`）。**非显然的逻辑是排序**：`sortPath`（`:25-30`）+ `orderBySlashCount`（`:18-22`）把路径分成含 `:` 与不含 `:` 两组，各自按斜杠数**降序**排，静态路径全部先于参数化路径注册——防止 `/:id` 抢先匹配掉同级的静态路由。这是 Express 系路由的经典陷阱，在这里被统一处理掉了。

注意 `EmptyObj`、`HTTPMethods`、`CustomHandlerType`、`Simplify` **都不在 `@tealina/server` 里**——它们是生成项目里 `types/handler.d.ts` 的内容，或来自 `@tealina/utility-types`。

## 3. 核心机制：目录即路由表

这是整个项目最要紧的一个设计。**api 目录的目录结构本身就是路由表**，没有单独的路由注册文件。

- `src/utils/codeGen.ts:4-7` `toRoutePath`：把路径段里的 `[id]` 转成 `:id`（Express/Koa/Fastify 通用的 path param 语法）。
- `genTopIndexProp`（`:9-12`）为每个 http method 目录生成一行 `'get': import('./get/index.js'),`
- `genIndexProp`（`:14-19`）为每个 handler 文件生成一行 `'/health': import('./health.js'),`
- `genWithWrapper`（`:21-22`）把行排序后包成 `export default { ... }`，**排序保证输出确定**（同输入必出同字节，diff 干净）。

于是 `src/api-v1/get/health.ts` 自动对应路由 `GET /health`；`src/api-v1/get/user/[id].ts` 对应 `GET /user/:id`。

**聚合文件全部是生成物，不是手写物。** 这正是 `-a`（align）存在的意义：磁盘上的文件树是唯一真相，聚合文件是它的投影。

## 4. 类型契约链

四个 `.d.ts` 构成从 handler 到前端的类型传导，缺一不可：

**`types/handler.d.ts`**（`packages/create-tealina/template/common/types/handler.d.ts`；下文所有 `handler.d.ts:N` 都指这个文件）——契约的顶点
- `RawPayload = { body?, params?, query?, headers? }`，`FullInfo = RawPayload & { response }`
- `OpenHandler<TPayload, TResponse, TLocals>` / `AuthedHandler<...>`——用户写 handler 时标注的就是这两个。`AuthedHandler` 额外注入 `AuthHeaders` 并把 `AuthedLocals & TLocals` 塞进 locals。
- 从 handler 反推 API 描述：`ExtractApiType`（`:53-60`）取 handler 元组的**最后一个元素**（`LastElement<T>`，即真正的 handler，前面是中间件），从中 `infer` 出 `Info`，再按目标平台投影。
- `ResolveApiTypeForDoc`（`:62`）与 `ResolveApiTypeForClient`（`:68`）——同一份 handler 类型，分别投影成文档用的形状和客户端用的形状。

**`types/alias.d.ts`**（每框架一份）——**框架适配的接缝**
`handler.d.ts:10` `import type { HandlerAliasCore } from './alias.js'`。三个框架的 `alias.d.ts` 各自定义同名的 `HandlerAliasCore`，把框架自己的上下文类型（koa 的 `ExtendableContext`、express 的 `Request`/`Response`、fastify 的请求对象）代入同一个泛型签名。**换框架只换这一个文件**，上层 `handler.d.ts` 一字不动。这是整套设计的关节所在。

**`src/convention.ts`**（每框架一份）——中间件契约的执行者
```ts
type ConstrainedHandlerType = [...Middleware[], CustomHandlerType]   // koa
type EnsureHandlerType = <const T extends ConstrainedHandlerType>(...handlers: T) => T
export const convention: EnsureHandlerType = (...handlers) => handlers
```
运行时它只是原样返回参数数组，**全部价值在那个 `<const T extends ...>` 元组泛型**：它保住每个元素在元组里的**位置**（`LastElement<T>` 才能据此揪出最后一个 handler），并禁止非 handler 占据末位。所以 `handler` 在 `transformToRouteOptions` 里是函数数组而非单个函数——fastify 适配器才要 `preHandler: handler.slice(0,-1)` / `handler: handler.at(-1)!` 这样切分，而 express / koa 直接把整个数组摊开交给框架（express 的 `(url, ...handlers)` 与 koa 的 `router[method](url, ...handler)` 本就接受这个形状）。**这条契约的守卫在 `convention.ts`，不在 `@tealina/server`。**

**`types/common.d.ts`**——用户可替换的业务类型（`AuthedLocals`、`AuthHeaders`、`JsonHeaders`、`ModelId`、`PageResult`）。名字比较通用，接进已有项目时存在撞名风险。

**`types/api-v1.d.ts`**——契约的出口，链接到 index 聚合文件
```ts
import apis from '../src/api-v1/index.js'
export type ApiTypesForDoc = { [M in keyof RawApis]: ResolveApiTypeForDoc<...> }
export type ApiTypesForClient = { [M in keyof RawApis]: ResolveApiTypeForClient<...> }
```
文件里的注释点明了两件事：**第一个 type 导出用于文档生成**（`parseDeclarationFile` 按顺序取第一个），且该文件由 `package.json` 的 `export.types` 暴露给外部包。

三层消费者：`gdoc` 读 `ApiTypesForDoc` → OpenAPI JSON；`web/src/api/client.ts:3` 读 `ApiTypesForClient` → 前端端到端类型；`exports["./api/v1"].types` → 跨包消费。

## 5. 类型层的两个核心机制：响应包装与 `MultiTarget`

### 5.1 响应类型的分级包装

`utility-types/index.ts` 用**唯一 symbol 打标**的方式，把「普通响应值」和「带元信息的响应」区分开：

| 类型 | 定义 | 含义 |
|---|---|---|
| `WithExtra<T>`（`:13-15`） | `T & { [ResponseFlagSymbol]: true }` | 给响应打标，声明「这是个富响应」。**这个 symbol 就是 doc 解析器探测的锚点** |
| `WithStatusCode<S,R>`（`:18-21`） | `WithExtra<{statusCode:S; response:R}>` | 带显式状态码的响应 |
| `WithStatusCodeOnly<S,D>`（`:24-30`） | 状态码 + 注释，无 body | |
| `WithHeaders<H,R>`（`:32-35`） | 带声明响应头 | |
| `ExtractResponse<T>`（`:37-39`） | `T extends WithExtra<infer R> ? R['response'] : T` | 把富响应塌缩回 body，普通类型恒等 |
| `Extract2xxResponse<T>`（`:41-48`） | 过滤出 `2xx` 的富响应，非富类型直通 | **客户端的返回类型** |
| `EmptyObject`（`:50-51`） | `{[emptyObjectSymbol]?: never}` | 名义空对象。`MakeParameters` 靠它判断「无 payload → 只传 config」 |
| `Simplify<T>`（`:53-55`） | `{[K in keyof T]: T[K]} & {}` | 把交叉类型拍平成好显示的对象 |

`HandlerAliasCore` 里 `R = ExtractResponse<PickTarget<TResponse,'server'>>`——所以 handler 收到的 `res` 是塌缩后的形状；而客户端那边用 `Extract2xxResponse` 再过滤一层，并且**已经拆掉了包装**——这正是模板 `client.ts` 里 `.then(v => v.data)` 的由来：拿到的直接是 body，不需要再取 `.data`。

### 5.2 `MultiTarget`：一份声明，三种投影

```
TargetKeys = 'server' | 'client' | 'doc'          // utility-types:82
MultiTarget<T> = T & { [MultiTargetSymbol]: true } // :110-112
PickTarget<T,K> = T extends MultiTarget<infer M> ? M[K] : T  // :114-116
```

`ShapeOfMultiTarget = MultiTarget<Record<TargetKeys, any>>`，`VariantPayload = RawPayload | ShapeOfMultiTarget`（`handler.d.ts:23-24`）——payload 可以写成普通对象，也可以按目标平台分叉。

**为什么需要分叉**：同一份声明要喂三个消费者，而三者的真实形状确实不同——

- **`server`**：handler 实际收到的。可能含中间件注入、浏览器**绝不能**发的字段（`utility-types:92-107` 的注释给了实例：客户端看到 `{query:{id:number}}`，服务端是 `IdInQuery & {query:{msgFromMidaware:string}}`），响应也可能是流/异步生成器
- **`client`**：浏览器收发的那部分，响应已拆包
- **`doc`**：OpenAPI 面。含显式的 `WithHeaders`/`WithStatusCode` 包装、示例值、可写 JSDoc 的具名类型

`PickTarget` 的分支挂在唯一 symbol 上，所以**没打标的普通类型原样穿过**（`:116`，即三元的 `: T` 那一支）——普通写法零成本，只有需要分叉时才付代价。打标只在两处发生：`alias.d.ts` 的 `PickTarget<TPayload,'server'>`/`PickTarget<TResponse,'server'>`，以及 `handler.d.ts:57-58` 的 `ExtractApiType`（取 `'doc'` 与 `'client'`）。限制：`:108` 注明**不支持嵌套**，`PickTarget` 只看顶层。

### 5.3 端到端类型流转（完整链路）

```
用户的 handler .ts
  const handler: OpenHandler<{body:LoginPayload}, {token:string}>
  export default convention(handler)
    ↓ OpenHandler → HandlerAlias → HandlerAliasCore（在 alias.d.ts 里绑定框架签名，
      并在此计算 PickTarget<...,'server'> / ExtractResponse<...>）
    ↓ convention() 用 <const T extends [...Middleware[], CustomHandlerType]> 保住元组位置

生成的 import 图（CLI 写，codeGen.ts:9-22）
  src/api-v1/index.ts      = { get: import('./get/index.js'), ... }
  src/api-v1/get/index.ts  = { '/health': import('./health.js'), ... }
    ↓ 同一个对象，两条并行的解读路径

【运行时】                                【类型】
loadAPIs(apisV1)                          types/api-v1.d.ts
  → Record<method, Record<url, fn>>         type RawApis = typeof apis
transformToRouteOptions<CustomHandlerType[]>  ApiTypesForDoc    = ResolveApiTypeForDoc<...>
  → {url, method, handler}[]                  ApiTypesForClient = ResolveApiTypeForClient<...>
适配器注册：                                  ↓ 都经 ExtractApiType：
  fastify preHandler=handler.slice(0,-1)        LastElement<T> extends HandlerAlias<infer Info,any>
          handler=handler.at(-1)!                 ? PickTarget<Omit<Info,'response'>,K>
  express instance[method](url, handler)          & {response: PickTarget<Info['response'],K>}
  koa     router[method](url, ...handler)

【→ OpenAPI JSON】                              【→ 前端类型】
gdoc                                           web/src/api/client.ts
 getApiTypeFilePath → types/api-v1.d.ts        import type {ApiTypesForClient} from 'server/api/v1'
 parseDeclarationFile 走 TS checker            （由 exports.types 映射到 types/api-v1.d.ts）
 靠正则 /__@ResponseFlagSymbol/ 认出富响应      createAxiosRPC<ApiTypesForClient, AxiosRequestConfig>
 → ApiDoc（@tealina/doc-types）                 → createRPC<ToRPC<T,C>, C>
 convertToOpenApiJson(apiDoc, '/api/v1')        → PathToObject 把 '/user/create' 嵌成对象
 → docs/api-v1.json                             → rpc.post.user.create({body}) : Promise<{...}>
        ↓                                         运行时是 Proxy，makeContext 把 :params 代入 URL
 doc 路由 serve 它，@tealina/doc-ui 渲染          （:param 按最长键优先替换）
```

`@tealina/client` 运行时两个都是 `Proxy`：`createReq`（`createReq.ts:23-44`）按 `[method][url]` 索引；`createRPC`（`createRPC.ts:51-78`）累积路径数组，`path[0]` 当 method、`path.slice(1).join('/')` 当 URL。两者都走 `makeContext`（`makeContext.ts:15-42`）做参数代入与 `URLSearchParams` 拼装。

## 6. CLI 的命令与选项流转

`src/commands/index.ts` 用 `cac` 注册。两条命令线：

- `<api-dir> [route] [options]` → `distribuite`（`index.ts:27-58`），一个函数按 `--align` / `--delete-api` / 无标志分流到 align / 删除 / 创建
- `<api-dir> gtype` / `gtype` → 生成纯净类型

**选项流转是统一的一条链**：
```
cac 解析 argv
  → loadConfigFromPath(options.configPath)   // 默认 ./tealina.config.ts
  → mergeInlineOptions(basicConfig, inlineOptions)  // 命令行覆盖配置文件
  → pickOption4Xxx(config)                   // 各命令自己挑它读得懂的字段
  → 具体实现
```
`pickOption4align`（`sapi.ts:173`）、`pickOption4gdoc`（`gdoc.ts:17`）、`pickOption4gtype`（`gtype.ts:432`）都是同一个模式：用 `pickFn` 从庞大的 `FullOptions` 里挑出本命令需要的子集。`FullOptions` 的定义在 `capi.ts:58`，是 `RawOptions` + `suffix` + `TealinaConifg` 的交叉类型。

`gdoc` 的 `gtype.input` 有个值得注意的兜底：`index.ts:42-51` 先看 `./prisma.config.ts` 里有没有 `schema` 字段，没有才退回 `./prisma/schema.prisma`。

## 7. 生成机制：Snapshot 三阶段

`src/utils/effectFiles.ts` 定义了全项目唯一的写盘通道：

```ts
type Snapshot = {
  group: 'api' | 'test' | 'types'
  action: 'update' | 'create' | 'delete'
  filePath: string
  code?: string | null
}
```
`effectFiles`（`:58-62`）= `filter(changedOnly)` → `groupBy(delete | mutation)` → 删文件（并 `cleanEmptyDirs` 递归清理空目录）/ 写文件 → `map(omit('code'))` 剥掉代码只留结果供日志。

`changedOnly`（`:23-24`）只在 `action === 'create' || action !== 'update' || code != null` 时放行——**没变的 update 会被丢掉**，所以重复运行不产生无谓写入。`completePath`（`:16-21`）把 filePath 前缀成 `apiDir` 相对路径。

这个设计让「生成」永远是幂等的纯函数：文件树 → snapshots → 落盘。也是为什么 `-a` 可以随便重跑。

## 8. 构建与发布

- **tealina 用 mkdist**（`build.config.ts` + `builder: 'mkdist'`）：`src/` 1:1 镜像到 `dist/`，**不打包**。所以 `dist/index.mjs` 只有 304 字节，且 `dist/commands/sapi.mjs` 这类深路径可被寻址。配套 `gen-types` 脚本（`package.json:15`）单独跑 `tsc --declaration --emitDeclarationOnly` 出 `.d.ts`，注意它**只以 `src/index.ts` 为根**，图外的文件拿不到声明。
- **create-tealina 用 unbuild rollup + `inlineDependencies: true`**：依赖全打进单文件，所以 `dependencies` 可以留着而产物自包含。
- **版本注入**：`scripts/update-version-in-template.mjs` 把各包的**真实版本号**写进模板的 `versionMaps.json`，目前只有一处（`kVersionMapPath`，`:82`）：`packages/create-tealina/template/versionMaps.json`。注意 `workflow()` 里对 versionMaps 的每个 key 都要求 `packages/<name>` 存在，否则 `throw sub pkg not found`；一旦新增模板副本，这里必须同步加路径，否则新模板里的版本号会一直停在上次手改的值。
- **发布**：changesets。CI 递归 `pnpm build` + `pnpm test`；publish workflow 在 CI 成功后跑 `pnpm release`。
- `scripts/inject-pnpm-overides.mjs` 把 monorepo 里的公共包以 `file:` 协议注入临时脚手项目的 overrides（调试 create-tealina 用），它**跳过 `create` 开头的目录**（`:10`）。

## 9. 脚手架路径

**目前只有一条**：

- **`create-tealina`**——绿地。组装 monorepo + Prisma 7 + zod env + create-vite，**自己不跑 install**，而是生成 `init-demo.mjs`（`src/core.ts:237-239`）让用户手动跑 `install → prisma generate → db push → v1 -a → v1 gtype → v1 gdoc`。它 ship 的 api 聚合文件是**手写预置**的，不跑 align。

**接进已有项目这条路，现在是空的。** 曾经在 `tealina` 包里做了一版 `tealina init`（`copyDir` + 跳过同名文件），已撤销。撤销的三个理由对下一版仍然是约束，所以留在这里：

1. **鸡生蛋**——它需要先装上 `tealina` 才能运行，而它的用途正是把 tealina 装进来。
2. **在已有项目上静默失败**——`copyDir` 跳过同名文件，于是用户已有的 `src/index.ts` 被跳过、`src/api-v1/` 落盘却没人挂载，命令行照常打印 `✔ tealina initialized`。
3. **不写 `exports["./api/v1"].types`**——而模板的 `web/src/api/client.ts` 与 README 都依赖它。

由此得到的结论：集成入口应当是一个 `create-*` 形态的**独立包**——`npx` 一次性运行、用完即走、不进入目标项目的依赖；而不是 `tealina` 自己的子命令。绿地归 create-tealina，集成归新包，两个入口不写同一套骨架。

## 10. 已发现的问题（都有证据）

**a. `create-tealina/src/template-factory/` 是死代码。** 10 个文件，全仓 grep 只有 `.github/CONTRIBUTING.md:23` 一处散文引用，无任何 import；`dist/index.mjs` 里 0 匹配。同目录的 `write.ts` 连 `create.ts` 都不引用。另两处死物：`pathe` 依赖从未 import、minimist 的 `-d` 标志从未被读。`.github/CONTRIBUTING.md:23` 那条文档链接指向的正是这个已死的目录。

**b. align 的兜底生成是坏的（本文最值得注意的一条）。** `withTypeFile.ts:20` `calcTypeFileSnapshot` 在类型文件**已存在时返回 `[]`**（永不重写），缺失时用 `codeGen.ts:24-39` 的 `genTypeCode` 生成。但两者产出的**不是同一套类型**：

| | 模板手写版 `api-v1.d.ts` | align 生成版 |
|---|---|---|
| 导入 | `ResolveApiTypeForDoc` / `ResolveApiTypeForClient` | `ResolveApiType` |
| 导出 | `ApiTypesForDoc` / `ApiTypesForClient` | `ApiTypesRecord` |

而 `handler.d.ts` 里**根本没有 `ResolveApiType`**（只有 `ResolveApiTypeForDoc`/`ResolveApiTypeForClient`，见 `:62`/`:68`），且没有任何代码消费 `ApiTypesRecord`——这个标识符只出现在 `tealina-client` 的 JSDoc 示例里（`src/axios/index.ts` 8 处、`src/fetch/index.ts:28,30`），被当作「让用户从 `'server/api/v1'` 导入的类型名」，而那些示例本身就与模板实际导出的 `ApiTypesForDoc`/`ApiTypesForClient` 对不上。也就是说：**一旦类型文件缺失（用户改了 api 目录名、或删了该文件），align 会生成一个导入不存在的类型、且无人使用的坏文件**——而文件名 `withTypeFile.ts:37` 又是跟着 `<basename(apiDir)>.d.ts` 走的，改目录名必然触发这条路径。同时 `gdoc` 靠 `parseDeclarationFile` 取第一个 type 导出，生成版的名字也对不上。

**c. `packages/tealina/package.json:24` 的 `files` 里 `"bin"` 并不存在**（包根只有 `index.js` shim，靠 npm 对 bin 目标的自动收录）。

**d. 其他小的**：`create-tealina/src/core.ts:369-377` 的 `getRuntime` 能返回 `'deno'`，但 `template/runtime/deno/` 不存在；`updateViteConfig`（`:318`）靠字符串手术切掉 `vite.config.ts` 的最后一行；`test/helper.ts:59` 的 `runScripts` 被注释掉，所以没有任何测试真正编译过生成的项目；`esbuild` target 写 `node18` 而 `engines` 要求 `>=20.19`。

## 11. 值得探讨的开放问题

1. **契约层单一来源。** `types/{handler,alias,common}.d.ts` 如今只有 `create-tealina/template/` 一份物理副本。但集成包一旦落地，只要它自带一份模板就会立刻变成两份，而这两份必须逐字节一致——否则两个入口产出的项目会以**不同的方式**通过类型检查，这类错误在类型层面是静默的。有没有办法让契约层只有一份物理副本：共享目录、构建期同步、还是抽成独立的 `@tealina/contracts` 包？
2. **align 兜底生成该修还是该删。** 选项：让 `genTypeCode` 生成和模板一致的 `ApiTypesForDoc`/`ApiTypesForClient`；或者干脆不再生成、缺文件就报错引导用户。前者保持「自动修复」，后者更诚实。
3. **api 目录名与 `v1` 标签的耦合**，比预想的更深。已确认绑在 `v1` 上的至少有六处：`types/api-v1.d.ts` 文件名（`withTypeFile.ts:37` 由 `<basename(apiDir)>.d.ts` 推出）、`exports["./api/v1"].types`、三个 doc 路由的 `path.resolve('docs/api-v1.json')`、vdoc 配置的 `baseURL:'/api/v1'`/`jsonURL:'./v1.json'`/`name:'v1'`、`gdoc` 的输出文件名（`gdoc.ts:44-47` `${basename(apiDir)}.json`）、以及 `convertToOpenApiJson` 的 base path（`genOpenApi.ts:34` 的默认参数 `prefix = '/api/v1'`——注意它从没被任何调用点显式传过，测试里都是单参数调用，所以改这个默认值就等于改所有输出的前缀）。要不要解开、解到什么程度？
4. **`types/common.d.ts` 的名字太通用**（`ModelId`、`FindManyArgs`、`PageResult`），接进已有项目撞名风险实在。
5. **create-tealina 与新集成包能否共用一套模板**，以及 create-tealina 是否也该改成跑 align 而不是预置聚合文件。
6. **死代码清理**（`template-factory/`、`pathe`、`-d`、deno 分支）要不要单开一次。
