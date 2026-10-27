# @tealina/doc-ui

一个自包含的 API 文档页面：端点浏览器、类型表格、Markdown 注释和交互式在线调试。它可以渲染
Tealina 的 `ApiDoc`（`tealina gdoc` 的产物）或 OpenAPI 文档，并在一页里展示多个 API 版本。

- Ctrl/Cmd+K 搜索端点
- 根据声明的载荷类型生成表单
- 明暗主题
- 每个 API 版本一个来源选项
- 可选的密码门禁和自定义请求处理器

```bash
npm install @tealina/doc-ui
```

要求 Node ≥ 22。包是 ESM，用 `node:fs` 和 `import.meta.url` 解析内置的 `static/` 目录，因此需要
真实文件系统路径。

## 服务端

包导出两个函数和配置类型：

| 导出 | 作用 |
| --- | --- |
| `assembleHTML(config)` | 返回注入配置后的页面 HTML |
| `getAssetsPath()` | 内置 `static/` 目录的绝对路径 |
| `TealinaVdocWebConfig` | 配置类型 |
| `TealinaVdocSource` | `config.sources` 的一项 |
| `CommonFieldsType` | `features.playground.commonFields` 的类型 |

`assembleHTML` 只生成字符串；HTML 和资源目录仍由你的服务器提供。

### Express

```ts
import express, { Router } from 'express'
import { assembleHTML, getAssetsPath, type TealinaVdocSource } from '@tealina/doc-ui'

const VDOC_BASENAME = '/api-doc'

const sources: TealinaVdocSource[] = [
  { name: 'v1', baseURL: '/api/v1', jsonURL: '/api/v1/_doc/api.json' },
]

// 启动时构建一次：只有宿主挂载了另一个版本时来源列表才会变。
const html = await assembleHTML({ sources, errorMessageKey: 'message' })

const docRouter = Router()
  .get('/index.html', (_req, res) => res.type('html').send(html))
  .use(express.static(getAssetsPath()))

app.use(VDOC_BASENAME, docRouter)
```

### Fastify

```ts
import plugin4static from '@fastify/static'
import { assembleHTML, getAssetsPath } from '@tealina/doc-ui'

const html = await assembleHTML({ sources })

fastify.get('/api-doc/index.html', (_req, reply) =>
  reply.type('text/html').send(html),
)
await fastify.register(plugin4static, {
  root: getAssetsPath(),
  prefix: '/api-doc/',
  decorateReply: false,
})
```

### Koa

```ts
import Router from '@koa/router'
import mount from 'koa-mount'
import serve from 'koa-static'
import { assembleHTML, getAssetsPath } from '@tealina/doc-ui'

const html = await assembleHTML({ sources })
const router = new Router()
router.get('/api-doc/index.html', ctx => {
  ctx.type = 'text/html'
  ctx.body = html
})

app.use(router.routes())
app.use(mount('/api-doc', serve(getAssetsPath())))
```

打开 `http://localhost:8000/api-doc/index.html`。

## 来源

`sources` 必填。每一项命名一个已挂载的 API 版本：

```ts
interface TealinaVdocSource {
  /** 在线调试页发请求时使用的前缀。 */
  baseURL: string
  /** 版本选择器里的标签；默认取 `jsonURL`。 */
  name?: string
  /** ApiDoc 或 OpenAPI JSON 文件的 URL。 */
  jsonURL: string
  /** 可选文本或 Markdown，显示在菜单顶部。 */
  introduceURL?: string
}
```

选中某个来源时页面才去拉取它的 `jsonURL`。带 `openapi` 键的文档按 OpenAPI 3.x 转换；否则按
`ApiDoc` 读取。来源多于一个时出现选择器，两个来源不能同名。

## 配置

```ts
import type { CommonFieldsType } from '@tealina/doc-ui'

type RequestConfig = { method: string; url: string } &
  Partial<Record<'body' | 'headers' | 'query' | 'params', unknown>>

interface TealinaVdocWebConfig {
  sources: TealinaVdocSource[]
  title?: string
  errorMessageKey?: string
  customScripts?: string[]
  customRequests?: {
    match: (config: RequestConfig) => boolean
    handler: (config: RequestConfig) => Promise<VariousResponseType>
  }[]
  features?: {
    playground?: {
      commonFields?: CommonFieldsType
    }
  }
  security?: {
    loginURL: string
    authenticationWay: 'session' | 'headers'
    logoutURL?: string
  }
}
```

`CommonFieldsType` 把每个载荷字段映射为 `'string'`、`'number'`，或带 `type` 和可选 `default`
的对象。

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `title` | `"API Document"` | 浏览器标题 |
| `errorMessageKey` | — | 在线调试页当作错误信息读取的响应字段 |
| `customScripts` | `[]` | 在配置之前注入的脚本 URL |
| `customRequests` | `[]` | 在默认 fetch 之前匹配的请求处理器 |
| `features.playground.commonFields` | — | 加到每个调试表单上的字段 |

### 公共字段

每个请求都需要相同的值（例如授权头）时用 `commonFields`。在线调试页会为它们创建一个可复用表单：

```ts
const html = await assembleHTML({
  sources,
  features: {
    playground: {
      commonFields: {
        headers: { Authorization: 'string' },
        query: { locale: { type: 'string', default: 'en' } },
      },
    },
  },
})
```

`'string'` 和 `'number'` 是简写；对象形式可以加默认值。

### 自定义请求

处理器可以替换匹配端点的默认 `fetch`——用于文件上传、流式响应或使用特殊鉴权的 API。处理器接收
请求配置，返回带标签的结果：

```ts
type VariousResponseType =
  | { type: 'error'; status: number; result: string }
  | { type: 'binary'; status: number; result: { blob: Blob; filename: string } }
  | { type: 'stream' | 'json-stream'; status: number; result: AsyncGenerator<string> }
  | { type: 'text' | 'json'; status: number; result: string }
```

处理器是函数，不能序列化进注入的配置。通过 `customScripts` 提供一个脚本，把处理器赋给页面读取的
全局变量：

```ts
const html = await assembleHTML({
  sources,
  customScripts: ['./custom-upload.js'],
})
```

```js
// custom-upload.js，与页面一同提供
window.TEALINA_VDOC_CUSTOM_REQUESTS = [
  {
    match: config => config.url.includes('/upload'),
    async handler(config) {
      const body = await upload(config)
      return { type: 'json', status: 200, result: JSON.stringify(body) }
    },
  },
]
```

### 密码保护

`security` 在页面之前放一个密码表单。页面向 `loginURL` POST `{ password }`：

- `authenticationWay: 'session'`——端点返回 `200`，浏览器保留会话 cookie。用户退出时调用
  `logoutURL`。
- `authenticationWay: 'headers'`——端点返回一个 JSON 对象，内容是页面拉取文档 JSON 文件时附加的请求头。

```ts
const html = await assembleHTML({
  sources,
  security: {
    loginURL: '/api/doc-login',
    authenticationWay: 'session',
    logoutURL: '/api/doc-logout',
  },
})
```

## 注意

页面是静态资源。启动时构建一次 HTML，之后把同一个字符串发给每个请求——只有宿主挂载了另一个 API
版本时配置才会变。
