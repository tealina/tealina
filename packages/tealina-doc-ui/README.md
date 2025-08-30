Automatically generates modern UI components for visualizing and interacting with your API resources.

**Key Features:**
- 🔍 **Ctrl+K Search**: Instant API endpoint search with keyboard shortcuts
- 🎨 **VS Code Color Scheme**: Familiar dark/light theme with syntax highlighting matching VS Code's style
- 📝 **Form Generation**: Auto-generates interactive forms with proper input fields for each API endpoint
- 🔄 **Dual Specification Support**: Renders from both [`@tealina/doc-types`](https://www.npmjs.com/package/@tealina/doc-types) and OpenAPI specifications
- 🔄 Supports multiple API versions through config
### Install

```bash
pnpm add @tealina/doc-ui

yarn add @tealina/doc-ui

npm i @tealina/doc-ui
```

### Usage

#### 1. Create Documentation Route

```typescript
// buildDocRoute.ts
import express, { Router } from 'express';
import path from 'node:path';
import {
  TealinaVdocWebConfig,
  getAssetsPath,
  assembleHTML,
} from '@tealina/doc-ui';

const VDOC_BASENAME = '/api-doc';

const vDocConfig: TealinaVdocWebConfig = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: './v1.json',
      name: 'v1',
    },
  ],
  errorMessageKey: 'message',
  features: {
    playground: {
      // Configure playground options
    },
  },
};

const docRouter = Router({ caseSensitive: true })
  .get('/index.html', async (req, res) => {
    const html = await assembleHTML(vDocConfig);
    res.send(html);
  })
  .get('/v1.json', (req, res) => {
    res.sendFile(path.resolve('docs/api-v1.json'));
  })
  .use(express.static(getAssetsPath()));

export { docRouter, VDOC_BASENAME };
```

#### 2. Register Documentation Route

```typescript
// server.ts
import express from 'express';
import { VDOC_BASENAME, docRouter } from './buildDocRoute';

const app = express();
app.use(VDOC_BASENAME, docRouter);
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
```

#### 3. Access Documentation

Start your server and open:
```
http://localhost:5000/api-doc/index.html
```