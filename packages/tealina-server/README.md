# File Routing Lazy Load Utilities

A utility package for resolving lazy import structures in file-based routing systems.

## Features

- 🚀 Automatically resolves nested lazy import routing structures
-  File system-based route organization
- ⚡ Lightweight with zero dependencies

## Installation

```bash
npm install @tealina/server
```

## Usage

### 1. Define API Handlers

```ts
// api-v1/post/login.ts
const handler = async (req, res) => {
  const { body } = req
  console.log(body.account)
  res.send({ token: 'JWT token' })
}

export default handler
```

### 2. Organize Route Structure

```ts
// api-v1/post/index.ts
export default {
  // path: import module
  '/login': import('./login.js'),
  '/user/create': import('./user/create.js'),
}
```

```ts
// api-v1/get/index.ts
export default {
  '/user/:id': import('./user/[id].js'),
}
```

```ts
// api-v1/index.ts
export default {
  'get': import('./get/index.js'),    // GET method routes
  'post': import('./post/index.js'),   // POST method routes
  // supports other HTTP methods
}
```

### 3. Register Routes

```ts
import { Router } from 'express'
import apis from './api-v1/index.js'
import { loadAPIs, transformToRouteOptions } from '@tealina/server'

export const buildV1Router = async () => {
  const apiRecord = await loadAPIs(apisV1)
  const apiRouter = Router()
  const routeOptions = transformToRouteOptions(apiRecord)
  for (const { url, method, handler } of routeOptions) {
    apiRouter[method](url, handler)
  }
  return apiRouter
}
```

## API Reference

### `transformToRouteOptions(apiRecord)`

Transforms lazy-import route structures into usable route options arrays.

**Parameters:**
- `apiRecord`: Lazy import object with specific structure

**Returns:**
Array of route options with:
- `url`: Route path
- `method`: HTTP method (get, post, put, delete, etc.)
- `handler`: Request handler function

## Project Structure Example

```
src/
├── api-v1/
│   ├── index.ts          # Main export file
│   ├── get/
│   │   ├── index.ts      # GET routes collection
│   │   └── user/[id].ts  # Dynamic route
│   └── post/
│       ├── index.ts      # POST routes collection
│       ├── login.ts      # Login endpoint
│       └── user/
│           └── create.ts # User creation endpoint
└── server.ts            # Server entry file
```