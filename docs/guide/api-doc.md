# API 文档

`tealina gdoc` 读取 `types/api.d.ts`，沿着处理函数的类型生成 `docs/api.json`。文档页由宿主提供，
每个 API 版本只发布自己的 JSON 文件。

```bash
pnpm -F api-v1 gdoc          # 重新生成 docs/api.json
pnpm -F api-v1 gdoc --check  # 只比较，过期时退出码 1
```

`gdoc` 读取 `types/api.d.ts` 里的**第一个导出类型**，所以 `ApiTypesForDoc` 必须保持第一，
`ApiTypesForClient` 放在它后面。顺序错了，文档会读错类型或失败。

## 生成物

- 默认输出目录是 `docs`，文件是 `docs/api.json`。
- `-o / --output <dir>` 可以改输出目录。
- 生成的 JSON 文件不手工编辑；处理函数改了以后重新运行 `gdoc`。
- 文档页读取磁盘上的 JSON 文件。页面提示文件缺失时，先运行一次 `gdoc`。

## 文档页

每个 API 版本在自己的 `src/doc.ts` 中导出一个 `docSource`：

```ts
import type { TealinaVdocSource } from '@tealina/doc-ui'
import { API_BASE_URL, API_VERSION } from '../version.js'

export const docSource: TealinaVdocSource = {
  name: API_VERSION,
  baseURL: API_BASE_URL,
  jsonURL: `${API_BASE_URL}/_doc/api.json`,
}
```

- `name` 是版本选择器里的标签，两个版本不能重名。
- `baseURL` 是在线调试页发请求时使用的前缀。
- `jsonURL` 是文档 JSON 文件的地址，脚手架里是 `/api/v1/_doc/api.json`。

`src/mount.ts` 把文档 JSON 文件注册到 `jsonURL`，并返回 `docSource`。宿主的 `server/src/doc.ts`
收集所有版本的来源，用 `@tealina/doc-ui` 的 `assembleHTML` 生成唯一一个页面：

```ts
const v1 = await mount(app)
await mountDocs(app, [v1])
```

页面地址是 `/api-doc/index.html`，同一个构建结果对每个请求复用。新增 `api-v2` 时，把它返回的
`docSource` 加进数组，页面就会出现第二个版本，不需要另一个页面。

## 自定义输出

`gdoc.customOutputs` 接收完整的 `ApiDoc` 和配置：

```ts
import { convertToOpenApiJson } from 'tealina'

export default defineConfig({
  // ...
  gdoc: {
    customOutputs: [
      (apiDoc, { baseURL }) => ({
        content: JSON.stringify(convertToOpenApiJson(apiDoc, baseURL)),
        filePath: 'docs/openapi.json',
      }),
    ],
  },
})
```

设置了 `customOutputs` 后，默认的 `docs/api.json` 不再写出。想两份都保留，加上：

```ts
gdoc: {
  keepOriginalOutput: true,
  customOutputs: [/* ... */],
}
```

`GdocContext` 提供 `outputDir`、`apiDir` 和 `baseURL`；`baseURL` 就是 `tealina.config.ts` 里的
`apiBaseURL`。

## 文档数据模型

`docs/api.json` 的形状由 `@tealina/doc-types` 定义：端点在 `apis` 下按方法分组，共享或递归类型存
在 `entityRefs`、`enumRefs`、`tupleRefs` 三张以数字 id 为键的表里，避免无限展开。

文档中的字段来自处理函数的 JSDoc：`/** ... */` 会保留，`// ...` 不会。载荷用 `interface` 声明，
否则类型名会丢失、内联展开。处理函数文件还可以导出 `examples`，为 `body`、`query`、`params`、
`headers`、`response` 提供文档页里的示例；`gdoc` 会把这些值一并写进 `docs/api.json`。这两种
文档来源都详见 [处理函数契约](./handler-contract.md)。

## 在 CI 中检查

```bash
pnpm -F api-v1 align --check --json
pnpm -F api-v1 gdoc --check --json
```

两条命令都不写文件，生成物过期时退出码为 1。`--json` 会在标准输出写一个对象：

```json
{ "ok": false, "changed": [{ "action": "update", "file": "docs/api.json" }] }
```

错误信息走标准错误，标准输出可以安全地交给其他工具解析。

## 相关

- [@tealina/doc-types](/reference/doc-types.md)：`ApiDoc` 与 `DocKind`。
- [@tealina/doc-ui](/reference/doc-ui.md)：页面配置、多版本、密码保护与自定义请求。
- [tealina CLI](/reference/cli.md)：`gdoc` 的全部参数。
