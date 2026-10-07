---
"tealina": major
---

Hand a handler template the directory its stub lands in, not a count of `../`

`TemplateContext.relative2api` is gone, replaced by `fileDir`: the directory the generated
file will be written into, spelled the way `apiDir` is — `src/api/v1/post` for the handler
`tealina src/api/v1 post/order` writes at `src/api/v1/post/order.ts`.

The old field was a depth, and a depth is only a path while the api directory sits where it
was assumed to: it was `namePaths.length + 1` dots, and that `+ 1` stands for `src/<api>`
being two segments. Move the api directory one level down — `src/api-v1` → `src/api/v1`,
which is what this release's templates do — and every stub comes out one `../` short. A
config reading the old field cannot repair that for itself, because repairing it means
knowing the api directory's own depth, and the only party that knows where the file goes is
the CLI. So the CLI now says where, and the config does the arithmetic it was always the
only one able to do:

```ts
function generateBasicCode({ fileDir }: TemplateContext) {
  const from = (dir: string) => posix.relative(fileDir, dir)
  // `from('types')`, `from('src')` — this project's layout, stated by this project
}
```

The test templates carry the same field under another name and move with it: `genSuite` and
`genHelper` were handed `relative2ancestor` — a depth, derived the same way, wrong the same
way — and now receive `fileDir`, the directory the test file or the helper will be written
into. `apiDirName` and `typesDirName` are unchanged.

**A config that reads `relative2api` stops working.** The property is `undefined`, so a
specifier built by concatenation reads `undefined/access.js` and one built with `node:path`
throws outright. No alias is kept: a number of `..` cannot stand in for a directory without
reintroducing exactly the assumption this removes. The same goes for `relative2ancestor` in
a test template.

`create-tealina`'s templates are written against the new field from the same release, so the
two have to move together — see that package's changeset.
