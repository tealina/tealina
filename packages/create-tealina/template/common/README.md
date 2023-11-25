### Initialize

```bash
node init-dev.mjs
```

### Manage Routes And Middlewares

Go to [app/index.ts](src/app/index.ts)

### File Structure

1. `dev-templates` store all code templates.
1. `tealian.config.mjs` for config Tealina.
1. `docs` store **[api-dir].json** which generate by `gdoc`
1. `types` store utility types and the **[api-dir].d.ts**

### Document Resources

[Tealina](https://www.tealina.dev),
[Primsa](https://www.prisma.io),
[Vitest](https://www.vitest.dev),
[Zod](https://www.zod.dev)

### Editor Setup

Install [Prisma extension](https://www.prisma.io/docs/guides/development-environment/editor-setup) for better development experience

### If you only use Primsa for generate type

1. Remove Prisma dependencies.
   eg:

```bash
pnpm remove prisma @prisma/client
```
