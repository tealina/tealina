# JavaScript 处理函数

脚手架生成 TypeScript，但 tealina 也支持 `.js` 处理函数。`.js` 文件可以和 `.ts` 文件一起编译、
一起检查，也可以按文件逐步迁移。

## 1. 打开 `allowJs`

在每个后端包的 `tsconfig.json` 和 `tsconfig.build.json` 里设置：

```json
{
  "compilerOptions": {
    "allowJs": true
  }
}
```

三个包都要改。`server` 通过 `api-v1/mount` 的 `types` 入口解析到 `src/mount.ts`，会连带编译整棵
路由树；`server` 里没有 `allowJs` 时，一个 `.js` 汇总导出文件会报 TS7016。

## 2. 在处理函数所在包打开 `checkJs`

在 `api-v1`（处理函数所在的包）的两个配置里再加上：

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true
  },
  "include": ["src/**/*.ts", "src/**/*.js"]
}
```

`include` 是显式列出的，单靠 `allowJs` 不会扩大匹配范围。构建配置本来包含整个 `src`，只需要两个
开关。

## 3. 设置 `sourceExt`

在 `api-v1/tealina.config.ts` 里：

```ts
export default defineConfig({
  // ...
  sourceExt: '.js',
})
```

`sourceExt` 决定 tealina 生成的文件扩展名：后续的 `create` 会写 JSDoc 版本的存根，`align` 会把
汇总导出文件命名为 `index.js`。它和 `suffix` 不是同一个选项：`suffix` 是生成 import 语句里的扩展名
（默认 `.js`），在 NodeNext 下 TypeScript 项目写 `import './x.js'`，而文件名仍是 `x.ts`。

## 4. 用全局类型写 JSDoc

推荐把处理函数类型声明成项目内的全局别名，这样每个 `.js` 文件都能直接写 `AuthedHandler<...>`，
不必重复 `import('core/handler')`。新建 `api-v1/src/global.d.ts`：

```ts
import type {
  AuthedHandler as AuthedHandlerType,
  OpenHandler as OpenHandlerType,
} from 'core/handler'

declare global {
  type OpenHandler<
    Payload extends Record<string, any> = {},
    Response = unknown,
    Locals extends Record<string, any> = {},
  > = OpenHandlerType<Payload, Response, Locals>

  type AuthedHandler<
    Payload extends Record<string, any> = {},
    Response = unknown,
    Locals extends Record<string, any> = {},
  > = AuthedHandlerType<Payload, Response, Locals>
}

export {}
```

`tsconfig.json` 与 `tsconfig.build.json` 都包含 `src`，不需要再改配置。之后处理函数直接使用全局名字：

```js
import { authedApi } from 'core/access'

/**
 * @typedef {object} LoginPayload
 * @property {string} account
 * @property {string} password
 */

/**
 * 登录并返回 token。
 * @type {AuthedHandler<{ body: LoginPayload }, { token: string }>}
 */
const handler = async (req, res) => {
  res.send({ token: 'JWT token' })
}

export default authedApi(handler)
```

不想增加全局声明时，也可以继续内联导入：
`@type {import('core/handler').AuthedHandler<...>}`。类型必须放在 `const` 上，不能写在
`openApi(...)` / `authedApi(...)` 的参数位置。

- 载荷形状用 `@typedef` 声明，文档生成器才能保留名字。
- 描述必须和 `@type` 在同一个 JSDoc 块里；被空行隔开的第二个块不会附着到声明上，端点会失去描述。
- 类型放在 `const` 上，不要内联到 `openApi(...)` / `authedApi(...)` 的参数位置：生成器靠这两个
  调用找到处理函数，内联注解会让它拿到一个表达式而不是名字。

## 5. 清理残留的 `index.ts`

从 `.ts` 切换到 `.js` 后第一次运行 `align`，它会写 `index.js`，但之前生成的 `index.ts` 仍在旁边。
NodeNext 会把 `import './index.js'` 解析到 `index.ts`，于是生成物获胜，新处理函数不可见。

删除残留的 `index.ts` 汇总导出文件，只保留一份。

## 改回 TypeScript

处理函数逐个改名回 `.ts`，全部完成后移除 `allowJs`、`checkJs` 和 `sourceExt`。前端的 `.js` 源码
需要在 `packages/web/tsconfig.json` 里同样打开 `allowJs` 和 `checkJs`；它的 `include` 已经覆盖
`.js`。

## 相关

- [处理函数契约](./handler-contract.md)：TypeScript 写法下的同一套规则。
- [tealina CLI](/reference/cli.md)：`sourceExt`、`suffix` 与配置探测。
