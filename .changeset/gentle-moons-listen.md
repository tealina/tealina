---
"tealina": major
---

Hand a handler template the directory its stub lands in, not a count of `../`

`TemplateContext.relative2api` is gone, replaced by `fileDir`: the directory the generated
file will be written into, spelled like `apiDir` — `src/api/post` for `tealina src/api
post/order` writing `src/api/post/order.ts`.

The old field was a depth (`namePaths.length + 1`, the `+ 1` assuming `src/<api>` is two
segments). Move the api directory one level deeper and every stub comes out one `../` short,
and a config cannot repair that for itself — only the CLI knows where the file goes. So the
CLI says where, and the config does the arithmetic:

```ts
function generateBasicCode({ fileDir }: TemplateContext) {
  const from = (dir: string) => posix.relative(fileDir, dir)
  // `from('types')`, `from('src')` — this project's layout, stated by this project
}
```

The test templates move the same way: `genSuite` and `genHelper` receive `fileDir` instead of
`relative2ancestor`. `apiDirName` and `typesDirName` are unchanged.

**A config that reads `relative2api` stops working** — the property is `undefined`, so a
concatenated specifier reads `undefined/access.js` and `node:path` throws. No alias is kept,
because a number of `..` cannot stand in for a directory without reintroducing the
assumption. The same goes for `relative2ancestor`. `create-tealina`'s templates are written
against the new field from the same release, so the two move together.
