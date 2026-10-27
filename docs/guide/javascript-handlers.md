# JavaScript Handlers

The scaffold generates TypeScript, but tealina also supports `.js` handlers. `.js` files compile and type-check alongside `.ts` files, and you can migrate file by file.

## 1. Turn On `allowJs`

Set this in each backend package's `tsconfig.json` and `tsconfig.build.json`:

```json
{
  "compilerOptions": {
    "allowJs": true
  }
}
```

All three packages need the change. `server` resolves through the `types` entry of `api-v1/mount` to `src/mount.ts` and compiles the whole route tree along with it; without `allowJs` in `server`, a `.js` barrel file reports TS7016.

## 2. Turn On `checkJs` in the Package That Holds the Handlers

Add this to both configs in `api-v1` (the package that holds the handlers):

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true
  },
  "include": ["src/**/*.ts", "src/**/*.js"]
}
```

`include` is listed explicitly; `allowJs` alone does not widen what is matched. The build config already includes the whole of `src`; only the two switches are needed.

## 3. Set `sourceExt`

In `api-v1/tealina.config.ts`:

```ts
export default defineConfig({
  // ...
  sourceExt: '.js',
})
```

`sourceExt` determines the file extension tealina generates: a later `create` writes JSDoc-style stubs, and `align` names the barrel file `index.js`. It is not the same option as `suffix`: `suffix` is the extension in generated import statements (default `.js`) — under NodeNext a TypeScript project writes `import './x.js'` while the file name is still `x.ts`.

## 4. Write JSDoc with Global Types

It is recommended to declare the handler types as project-wide global aliases, so every `.js` file can write `AuthedHandler<...>` directly without repeating `import('core/handler')`. Create `api-v1/src/global.d.ts`:

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

Both `tsconfig.json` and `tsconfig.build.json` include `src`; no config change is needed. Afterwards handlers use the global names directly:

```js
import { authedApi } from 'core/access'

/**
 * @typedef {object} LoginPayload
 * @property {string} account
 * @property {string} password
 */

/**
 * Log in and return a token.
 * @type {AuthedHandler<{ body: LoginPayload }, { token: string }>}
 */
const handler = async (req, res) => {
  res.send({ token: 'JWT token' })
}

export default authedApi(handler)
```

If you do not want to add global declarations, you can keep importing inline: `@type {import('core/handler').AuthedHandler<...>}`. The type must go on the `const`, not in the argument position of `openApi(...)` / `authedApi(...)`.

- Declare payload shapes with `@typedef`, so the docs generator can keep the name.
- The description must be in the same JSDoc block as `@type`; a second block separated by a blank line does not attach to the declaration, and the endpoint loses its description.
- Put the type on the `const`, not inline in the argument position of `openApi(...)` / `authedApi(...)`: the generator finds the handler through these two calls, and an inline annotation gives it an expression instead of a name.

## 5. Clean Up the Leftover `index.ts`

The first time you run `align` after switching from `.ts` to `.js`, it writes `index.js`, but the previously generated `index.ts` is still sitting next to it. NodeNext resolves `import './index.js'` to `index.ts`, so the generated artifact wins and the new handler is invisible.

Delete the leftover `index.ts` barrel file and keep only one.

## Switching Back to TypeScript

Rename the handlers back to `.ts` one by one; when they are all done, remove `allowJs`, `checkJs` and `sourceExt`. Frontend `.js` source needs `allowJs` and `checkJs` turned on in `packages/web/tsconfig.json` as well; its `include` already covers `.js`.

## Related

- [Handler Contract](./handler-contract.md): the same rules written in TypeScript.
- [tealina CLI](/reference/cli.md): `sourceExt`, `suffix` and config detection.
