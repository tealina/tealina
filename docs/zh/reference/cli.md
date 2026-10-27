# tealina CLI

`tealina` 把目录树变成路由表、把处理函数注解变成 API 文档、把 Prisma schema 变成纯 TypeScript
类型。所有命令都由一个配置文件驱动。

```bash
npm install -D tealina
```

| 命令 | 作用 |
| --- | --- |
| `create [route]` | 写入处理函数存根并更新汇总导出文件 |
| `delete <route>` | 删除处理函数并更新汇总导出文件 |
| `align` | 根据磁盘上的文件重建所有生成的汇总导出文件 |
| `gdoc` | 从 `types/api.d.ts` 生成 API 文档 |
| `gtype` | 从 Prisma schema 生成纯类型 |

环境要求：Node ≥ 22；TypeScript `>=5.6.2 <7` 作为对等依赖。`gdoc`、`gtype` 和类型投影通过
TypeScript Compiler API 读取声明文件。TypeScript 7 是 Go 原生重写，当前最新版 7.0.2 仍未提供
该 API，所以暂不支持；等上游提供后再放宽上界。

## 全局选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `--config-path <path>` | `./tealina.config.ts` | 配置文件路径 |
| `--verbose` | — | 命令抛错时打印调用栈 |
| `-h, --help` | — | 帮助 |
| `-v, --version` | — | 版本 |

没有显式传 `--config-path` 时，CLI 会依次探测 `tealina.config.ts`、`tealina.config.js`、
`tealina.config.mjs`。显式传入的路径按原样使用，即使文件不存在——失败信息会点名你要求的那个文件。

## 配置

```ts
import { defineConfig } from 'tealina'

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
})
```

```ts
interface TealinaConfig {
  apiDir: string
  apiBaseURL: string
  typesDir: string
  exclude?: string[]
  handlerImport?: string
  suffix?: string
  sourceExt?: string
  testDir?: string
  template?: TemplateConfig
  gtype?: GtypeConfig
  gdoc?: GdocConfig
}
```

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `apiDir` | 必填 | 每个文件就是一条路由 |
| `apiBaseURL` | 必填 | 路由对外回答的 URL 前缀 |
| `typesDir` | 必填 | `api.d.ts` 所在目录 |
| `exclude` | `[]` | 相对 `apiDir` 的 POSIX 通配符，不参与路由 |
| `handlerImport` | `./handler${suffix}` | 兜底 `types/api.d.ts` 导入处理函数类型的模块说明符 |
| `suffix` | `.js` | 生成的 `import` 语句里的扩展名 |
| `sourceExt` | `.ts` | 生成文件本身的扩展名；JavaScript 项目设为 `.js` |
| `testDir` | — | `--with-test` 生成集成测试的位置 |
| `template` | — | 自定义处理函数与测试生成器 |
| `gtype` | — | Prisma 类型生成选项 |
| `gdoc` | — | 自定义文档输出 |

`apiDir` 是路由发现的唯一输入；`apiBaseURL` 是部署选择，CLI 不会从目录名推断。公共产物名固定：
`types/api.d.ts`、`docs/api.json`、包里的 `exports["./api"]`。

每个命令的选项都来自配置文件，所以包的脚本可以保持无参数：

```json
{
  "scripts": {
    "create": "tealina create",
    "align": "tealina align",
    "gdoc": "tealina gdoc"
  }
}
```

## `create`

```bash
tealina create post/user      # src/api/post/user.ts
tealina create user/login     # 未写方法时默认 post
tealina create post/user/:id  # 参数段写成 [id]
tealina create -m -i ./prisma/schema.prisma -t c
```

| 选项 | 说明 |
| --- | --- |
| `-m, --model` | 为 Prisma schema 里的每个模型创建一个端点 |
| `-i, --input <path>` | Prisma schema 路径（默认 `./prisma/schema.prisma`） |
| `-t, --template-alias <alias>` | 按别名选择处理函数模板 |
| `--with-test` | 同时生成集成测试文件 |
| `--tp, --tsconfig-path <path>` | 解析处理函数类型用的 tsconfig（默认 `./tsconfig.json`） |

批量模式（`--model`）需要同时给出 `-i` 和 `-t`。没有 `-t` 时使用别名为 `*` 的兜底模板。

路由段写作 `:id` 或 `[id]` 都可以，落盘统一为 `[id].ts`。

## `delete`

```bash
tealina delete post/user/login
tealina delete post/user/login --with-test
```

删除处理函数并重写汇总导出文件。`--with-test` 一并删除生成的测试文件；同样支持
`--tp / --tsconfig-path`。

## `align`

根据磁盘上实际存在的文件，重建每个 `index.*` 和兜底的 `types/api.d.ts`。手工增删改文件后运行它。

```bash
tealina align
tealina align --check
tealina align --check --json
```

| 选项 | 说明 |
| --- | --- |
| `--check` | 只比较，不写入；有过期文件时退出码 1 |
| `--json` | 标准输出写一个 `{ ok, changed }` 对象 |

`--check` 与正常执行使用同一套生成逻辑，在写入前停下。

`exclude` 的示例：

```ts
export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
  exclude: ['_shared/**', '**/*.test.ts'],
})
```

`align` 总是跳过 `index` 文件和点文件。

## `gdoc`

读取 `types/api.d.ts`，跟随处理函数导入，写出 `docs/api.json`。文件里的**第一个导出类型**会被
读取，因此 `ApiTypesForDoc` 必须保持第一，`ApiTypesForClient` 第二。

```bash
tealina gdoc
tealina gdoc -o docs
tealina gdoc --check --json
```

| 选项 | 说明 |
| --- | --- |
| `-o, --output <string>` | 输出目录（默认 `docs`） |
| `--check` | 只比较，不写入；退出码 1 表示过期 |
| `--json` | 标准输出写一个 `{ ok, changed }` 对象 |
| `--tp, --tsconfig-path <path>` | 解析类型用的 tsconfig |

自定义输出接收完整 `ApiDoc` 和 `GdocContext`：

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

设置 `customOutputs` 后默认的 `docs/api.json` 被替换；加 `keepOriginalOutput: true` 保留两份。
`GdocContext` 包含 `outputDir`、`apiDir`、`baseURL`。

## `gtype`

读取 Prisma schema，生成纯 TypeScript 类型。关系字段会被省略，输出可以独立组合。

```bash
tealina gtype
tealina gtype -i ./prisma/schema.prisma -o types/pure.d.ts -n Pure
```

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `-i, --input <path>` | `./prisma/schema.prisma` | schema 路径；存在 `prisma.config.ts` 时读取其中的 `schema` |
| `-n, --namespace <name>` | `Pure` | 命名空间；空字符串表示不包命名空间 |
| `-o, --output <string>` | `types/pure.d.ts` | 输出文件 |

`gtype.overwrite` 可以让选中的 Prisma 变更类型属性可选、改写类型或删除：

```ts
export default defineConfig({
  // ...
  gtype: {
    output: 'types/pure.d.ts',
    namespace: 'Pure',
    overwrite: {
      isOptional: [
        {
          blockName: '*',
          keyword: '*',
          kind: 'UpdateInput',
          predicate: prop => prop.name === 'id',
        },
      ],
    },
  },
})
```

回调类型导出为 `Overwrite`、`MatchForOptionalCheck`、`MatchForTypeTransform`、
`MatchForExcludeProp`。

## 自定义模板

`template.handlers` 替换内置存根。每项有别名、可选的模板名（也是生成文件名）和可选方法：

```ts
import { defineApiTemplates, defineConfig } from 'tealina'

const handlers = defineApiTemplates([
  {
    alias: 'c',
    name: 'create',
    method: 'post',
    generateFn: ctx => `// ${ctx.method} ${ctx.dir}/${ctx.filename}`,
  },
  { alias: '*', generateFn: () => 'export default () => {}' },
])

export default defineConfig({
  apiDir: 'src/api',
  apiBaseURL: '/api/v1',
  typesDir: 'types',
  template: { handlers },
})
```

`ctx.sourceExt` 告诉生成器项目写 `.ts` 还是 `.js`；`ctx.fileDir` 是文件将落入的目录。别名 `*` 是
没有匹配项时的兜底。

## 编程接口

| 导出 | 作用 |
| --- | --- |
| `defineConfig` | 配置对象的恒等辅助函数 |
| `defineApiTemplates` | 处理函数模板列表的恒等辅助函数 |
| `makeTemplate` | 单个处理函数生成器的恒等辅助函数 |
| `makeTestSuiteTemplate` / `makeTestHelperTemplate` | 测试生成器的恒等辅助函数 |
| `convertToOpenApiJson` | 把 `ApiDoc` 转成 OpenAPI 3.1 |
| `tealina/utility-types` | `@tealina/utility-types` 的纯类型再导出 |

`OpenAPIV3` 与 `OpenAPIV3_1` 以类型形式从 `openapi-types` 再导出。
