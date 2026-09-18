import fs from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { kServerTemplates, templateRootDir } from '../src/core.js'
import { initFiles } from '../src/init.js'

/**
 * T4 — the manifest `init` copies from, held still.
 *
 * `init` is nothing but a list of template files plus a copy loop, so the list is the
 * feature. Two things rot it, and neither shows up until a user runs the command against a
 * real project:
 *
 *   1. a path stops existing when the template is reorganised;
 *   2. a copied file imports something that was not copied — `init` then ships a file that
 *      does not resolve, in the user's repo, without touching a single file of theirs that
 *      would have warned them.
 *
 * Both are pure assertions over the shipped template, so this runs offline in milliseconds.
 * The compiled proof is test/init.test.ts.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(here, '..')

/** The one path in the set that is written rather than copied — see `kEmptyApiIndex`. */
const GENERATED = 'src/api-v1/index.ts'

const exists = (rel: string) => fs.existsSync(path.join(templateRootDir, rel))

const read = (rel: string) =>
  fs.readFileSync(path.join(templateRootDir, rel), 'utf-8')

/**
 * Every `from '...'` and `import('...')` a file really declares.
 *
 * Comments and template literals are stripped first, and that is not tidiness:
 * `tealina.config.ts` is a code generator, so the import lines it *emits* are backtick
 * strings sitting in this file. A raw scan reads them as imports of the config itself, with
 * a `${relative2api}` in the specifier that no path resolver can evaluate. What they emit
 * is a different question — it lands in files `align` generates, not in the copied set.
 */
const importsIn = (source: string) => {
  const code = source
    .replace(/`(?:[^`\\]|\\.)*`/g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  return [
    ...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map(m => m[1])
}

/**
 * `./x.js` is how these files spell `./x.ts` — the contract layer is compiled with
 * `moduleResolution: NodeNext`, where the emitted name is the one you write. Try the
 * TypeScript spellings before the literal one.
 */
const resolveRel = (fromRel: string, spec: string, dests: Set<string>) => {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRel), spec),
  )
  const bare = base.replace(/\.js$/, '')
  return [base, `${bare}.ts`, `${bare}.d.ts`, `${bare}/index.ts`].find(
    candidate => dests.has(candidate),
  )
}

/** `@scope/name/deep` → `@scope/name`; `name/deep` → `name`. */
const packageOf = (spec: string) => {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

const isBuiltin = (spec: string) =>
  spec.startsWith('node:') || builtinModules.includes(packageOf(spec))

const declaredBy = (fw: string) => {
  const pkg = JSON.parse(read(`server/${fw}/package.json`)) as Record<
    string,
    Record<string, string>
  >
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])
}

describe('init manifest', () => {
  for (const fw of kServerTemplates) {
    const files = initFiles(fw)
    const dests = new Set([...files.map(f => f.dest), GENERATED])

    it(`${fw}: every source path exists in the shipped template`, () => {
      const missing = files.filter(f => !exists(f.src)).map(f => f.src)
      expect(
        missing,
        `template files the manifest names but does not ship`,
      ).toEqual([])
    })

    it(`${fw}: copies only out of what create ships`, () => {
      // `init` reads from `template/common/` and `template/server/<fw>/`, which is what
      // `create` copies wholesale. Reaching outside that would mean this feature depends on
      // a file the scaffold neither ships nor maintains.
      const outside = files
        .map(f => f.src)
        .filter(
          src => !src.startsWith('common/') && !src.startsWith(`server/${fw}/`),
        )
      expect(outside).toEqual([])
    })

    it(`${fw}: writes each destination at most once`, () => {
      const all = [...files.map(f => f.dest), GENERATED]
      expect(all.length).toBe(new Set(all).size)
    })

    it(`${fw}: no copied file imports anything that was not copied`, () => {
      // The load-bearing one. A relative import that leaves the set is a file `init` drops
      // into a project where it cannot resolve; a bare import the framework's manifest
      // never declares is a module the user's install will not have.
      const declared = declaredBy(fw)
      const problems: string[] = []

      for (const { src, dest: rel } of files) {
        for (const spec of importsIn(read(src))) {
          if (spec.startsWith('.')) {
            if (resolveRel(rel, spec, dests) == null) {
              problems.push(`${rel} imports ${spec}`)
            }
          } else if (!isBuiltin(spec) && !declared.has(packageOf(spec))) {
            problems.push(
              `${rel} imports ${spec} (not in the template manifest)`,
            )
          }
        }
      }

      expect(problems).toEqual([])
    })
  }
})
