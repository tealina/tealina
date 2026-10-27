# 快速开始

Tealina 把一个目录树和一个处理函数的类型注解，变成路由、客户端类型和 API 文档。脚手架生成的是
一个可以直接编译、启动的 Node API 服务，支持 Express、Fastify 和 Koa。

## 环境要求

- **Node ≥ 22**。仓库和生成的项目都以它作为下限。
- **TypeScript 5.6.2 至 6.x**。CLI 通过 TypeScript Compiler API 读取声明文件；TypeScript 7
  是 Go 原生重写，当前最新版 7.0.2 仍未提供该 API，因此暂不支持。等上游提供后再放宽版本上界。
- **pnpm ≥ 11**（用于 `pnpm install`）：生成的 `pnpm-workspace.yaml` 使用 `allowBuilds`，
  更早的 pnpm 会忽略它。脚手架本身不安装依赖，只打印首次运行的命令。

脚手架不包含数据库层，也不依赖 Prisma。

## 创建项目

```bash
# pnpm
pnpm create tealina my-app

# npm
npm create tealina@latest my-app

# bun
bun create tealina my-app
```

随后会询问项目目录和服务器框架。脚手架只写文件，不安装依赖，也不运行 `gdoc`；它结束时会打印
首次运行的命令。安装并生成文档后，文档页才可用：

```bash
cd my-app
pnpm install
pnpm -F api-v1 gdoc
pnpm dev
```

### 非交互运行

| 参数 | 作用 |
| --- | --- |
| `--template express\|fastify\|koa` | 跳过框架选择 |
| `--web` | 额外生成 `packages/web`，一个最小的 Vite 前端 |
| `--integrate` | 在项目根写入 `INTEGRATION.md`，一份供 AI 助手使用的整合手册 |

项目名与 `--template` 同时给出时完全不提问：

```bash
pnpm create tealina my-app --template fastify --web
```

脚手架只生成 TypeScript。如果项目里仍有 `.js` 处理函数，见
[JavaScript 处理函数](./javascript-handlers.md)。

目标目录非空时，脚手架会先确认是否删除；非交互运行请指向新目录或空目录。

## 启动

```bash
cd my-app
pnpm dev
```

| 地址 | 内容 |
| --- | --- |
| `http://localhost:8000` | API 服务 |
| `http://localhost:8000/api-doc/index.html` | API 文档与在线调试 |
| `http://localhost:5173` | 前端，仅在 `--web` 时存在 |

端口来自 `backend/server/.env`。把 `.env.example` 复制为 `.env` 后修改 `PORT`；前端代理的
目标也在 `packages/web/vite.config.ts` 中。

## 添加第一个端点

方法名和文件名就是 HTTP 方法和路径：

```bash
pnpm -F api-v1 run create post/user   # 写入 src/api/post/user.ts
pnpm -F api-v1 align                  # 重建生成的 index 文件
pnpm -F api-v1 gdoc                   # 重新生成 docs/api.json
```

`run` 不能省略：`pnpm create` 是 pnpm 自己的项目脚手架，不是这里的脚本。

打开刚生成的文件，补上处理函数：

```ts
import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'

interface UserPayload {
  name: string
}

type ApiType = AuthedHandler<{ body: UserPayload }, { id: number }>

const handler: ApiType = async (req, res) => {
  res.send({ id: 1 })
}

export default authedApi(handler)
```

处理函数只负责声明接口契约和调用业务逻辑。数据库、校验、事务等实现应放在服务模块里，例如
`backend/core/src/services/`；处理函数里只留下读取请求和发送响应。文档页需要的示例值可以通过
文件里的 `examples` 导出提供，详见 [处理函数契约](./handler-contract.md)。

新端点默认要求 `Authorization` 头。要公开它，把 `AuthedHandler` 换成 `OpenHandler`，并把
`authedApi` 换成 `openApi`，详见 [鉴权](./authentication.md)。

## 接下来

- [项目结构](./project-structure.md)：三个后端包各自负责什么。
- [文件即路由](./routing.md)：`create`、`delete`、`align` 与生成文件的规则。
- [处理函数契约](./handler-contract.md)：类型注解如何驱动路由、文档和客户端。
