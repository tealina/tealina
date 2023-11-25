API document type designed for transformation tools

#### Pre-knowledge

> There's a package call [tealina](https://www.npmjs.com/package/tealina), it offer some CLI commands make create API service more easier, one of the command is `tealina gdoc`, it generate a `doc.json` file.

### Install

> Should be add as dependencies, not devDependencies, because the DocKind is exported as const object

```bash
pnpm add @tealina/doc-types

yarn add @tealina/doc-types

bun add @tealina/doc-types

npm i @tealina/doc-types
```

### Demo

<!-- prettier-ignore-start -->
```json
//doc.json
{
  "apis": {
    "get": { // http method
      "health": { // endpoind
        "response": {// DocNode
          "kind": 4, // DocKind
          "id": 268 
        },
      }
    }
  },
  "entityRefs": {
    "268": {
      "name": "{ status: string; }",
      "props": [
        {
          "kind": 0,// DocKind
          "type": "string",
          "name": "status"
        }
      ]
    }
  }
}
```
<!-- prettier-ignore-end -->

#### Every `DocNode` has a `kind` property, it's easy to code with switch case.

```tsx

import { DocNode, DocKind, EntityRef } from '@tealina/doc-types'

function tranform2span(docNode:DocNode){
  switch(docNode.kind){
    case DocKind.Primitive:
      return <span>{docNode.type}</span>
    ...
  }
}

```

### Convention

The name of your package should have a clear name with tealina-doc prefix.
