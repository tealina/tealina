Automatic generate modern UI for visualize and interact API's resources.

> The document resouces should be json file in [@tealina/doc-types](https://www.npmjs.com/package/@tealina-doc-types) format.

### Install

```bash
pnpm add @tealina/doc-ui

yarn add @tealina/doc-ui

npm i @tealina/doc-ui
```

### Usage

1. Build the route whith recourses

```ts
// buildDocRoute.ts
import express, { Router } from 'express'
import path from 'node:path'
import {
  TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
  VDOC_BASENAME,
} from '@tealina/doc-ui'

const vDocCofig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: `${VDOC_BASENAME}/v1.json`,
      name: 'v1',
    },
  ],
  errorMessageKey: 'message',
  features: {
    playground: {
      //...
    },
  },
}

const docRouter = Router({ caseSensitive: true })
  .get('/index.html', (req, res, next) => {
    assembleHTML(vDocCofig).then(html => res.send(html))
  })
  .get('/v1.json', (req, res, next) => {
    res.sendFile(path.resolve('docs/api-v1.json'))
  })
  .use(express.static(getAssetsPath()))

export { docRouter, VDOC_BASENAME }
```

2. Regitst Route

```ts
// server.ts
import { VDOC_BASENAME, docRouter } from './buildDocRoute.ts'
express().use(VDOC_BASENAME, docRouter).listen(5000)
```

3. Open the link after server started.

```
http://localhost:5000/api-doc/index.html
```
