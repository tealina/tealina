import fs from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { kServerTemplates, templateRootDir } from '../src/core.js'
import {
  type Mode,
  type TemplateFile,
  createFiles,
  initFiles,
  webFiles,
  webHostFiles,
} from '../src/template-manifest.js'

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

const MODES: Mode[] = ['ts', 'js']
const ext = (mode: Mode) => (mode === 'js' ? 'js' : 'ts')

/** The one path in the set that is written rather than copied — see `kEmptyApiIndex`. */
const generatedIndex = (mode: Mode) => `src/api-v1/index.${ext(mode)}`

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
  // Template literals always go first: `tealina.config.js` is a code generator, and the
  // import lines it *emits* are backtick strings sitting in this file, with a
  // `${…}` in the specifier that no path resolver can evaluate. What they emit is a
  // different question — it lands in files `align` generates, not in the copied set.
  const noTemplates = source.replace(/`(?:[^`\\]|\\.)*`/g, '')
  const code = noTemplates
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  return [
    ...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    // `import(…)` is looked for with comments left in, unlike `from`. In a JavaScript
    // tree that is where the API contract is reached from — a
    // `@typedef {import('server/api/v1')…}` is a comment and still a dependency, and
    // nothing else in the file names the package it comes from.
    ...noTemplates.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map(m => m[1])
}

/**
 * `./x.js` is how these files spell `./x.ts` — the contract layer is compiled with
 * `moduleResolution: NodeNext`, where the emitted name is the one you write. Try the
 * TypeScript spellings before the literal one, and in a JavaScript tree the literal one is
 * a real file rather than a spelling, so both modes resolve through here.
 */
const resolveRel = (fromRel: string, spec: string, dests: Set<string>) => {
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRel), spec),
  )
  const bare = base.replace(/\.js$/, '')
  return [
    base,
    `${bare}.ts`,
    `${bare}.js`,
    `${bare}.d.ts`,
    `${bare}/index.ts`,
    `${bare}/index.js`,
  ].find(candidate => dests.has(candidate))
}

/** `@scope/name/deep` → `@scope/name`; `name/deep` → `name`. */
const packageOf = (spec: string) => {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

const isBuiltin = (spec: string) =>
  spec.startsWith('node:') || builtinModules.includes(packageOf(spec))

/** Every file under the given template directories, relative to `templateRootDir`. */
const walkTemplate = (roots: string[]): string[] => {
  const out: string[] = []
  const walk = (rel: string) => {
    const entries = fs.readdirSync(path.join(templateRootDir, rel), {
      withFileTypes: true,
    })
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(child)
      else out.push(child)
    }
  }
  for (const root of roots) walk(root)
  return out
}

/**
 * The dependencies of the tree this mode actually ships. Read per mode rather than off the
 * framework's TypeScript manifest, because the two do differ — the JavaScript one carries
 * no `tsx` — and `init` merges from whichever tree it is installing.
 */
const declaredIn = (manifestRel: string) => {
  const pkg = JSON.parse(read(manifestRel)) as Record<
    string,
    Record<string, string>
  >
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])
}

const declaredBy = (fw: string, mode: Mode) =>
  declaredIn(
    `${mode === 'js' ? `server/${fw}-js` : `server/${fw}`}/package.json`,
  )

describe('init manifest', () => {
  it('names every file the template actually ships', () => {
    // The direction this refactor made necessary: the manifest is now the only thing
    // `create` copies from, so a file sitting in the template that it does not name is a
    // file that silently stops being shipped. Only a walk of the real directory can see
    // that.
    //
    // The union across modes is the honest form of the question. A file is dead weight if
    // *no* mode names it; a file named by the other mode only is a file the two trees
    // share on purpose (the contract layer, which is why `post` for an `express` file is
    // listed under the TypeScript tree and still shipped to JavaScript projects).
    const named = new Set(
      MODES.flatMap(mode => [
        ...kServerTemplates.flatMap(fw =>
          createFiles(fw, mode).map(f => f.src),
        ),
        ...webFiles(mode).map(f => f.src),
        ...webHostFiles(mode).map(f => f.src),
      ]),
    )
    const unnamed = walkTemplate(['common', 'server', 'web']).filter(
      f => !named.has(f),
    )
    expect(unnamed, 'template files no mode names, so they never ship').toEqual(
      [],
    )
  })

  for (const mode of MODES) {
    for (const fw of kServerTemplates) {
      const files = initFiles(fw, mode)
      const dests = new Set([...files.map(f => f.dest), generatedIndex(mode)])

      it(`${fw} (${mode}): every source path exists in the shipped template`, () => {
        const missing = files.filter(f => !exists(f.src)).map(f => f.src)
        expect(
          missing,
          `template files the manifest names but does not ship`,
        ).toEqual([])
      })

      it(`${fw} (${mode}): copies only out of what create ships`, () => {
        // `init` may not reach for a file `create` would not have shipped: that would mean
        // this feature depends on something the scaffold neither ships nor maintains.
        const shipped = new Set(createFiles(fw, mode).map(f => f.src))
        const outside = files.map(f => f.src).filter(src => !shipped.has(src))
        expect(outside, 'init copies files create does not ship').toEqual([])
      })

      it(`${fw} (${mode}): writes each destination at most once`, () => {
        const all = [...files.map(f => f.dest), generatedIndex(mode)]
        expect(all.length).toBe(new Set(all).size)
      })

      it(`${fw} (${mode}): every generated file carries the mode's extension`, () => {
        // A JavaScript tree that shipped a `.ts` file would hand the host a source file
        // their compiler is not configured for; a TypeScript tree that shipped `.js`
        // would hand them one nothing type-checks. The contract layer is the exception —
        // `.d.ts` is a type file in both modes, and the two modes share one copy of it.
        const wrong = files
          .map(f => f.dest)
          .filter(dest => {
            // `.d.ts` is a type file in both modes; `.json`, `.html` and the
            // extensionless placeholders (`docs/.gitkeep`) are not source and carry no
            // mode at all. `index.html` is in the same position as a `.d.ts`: one
            // spelling, both trees, because nothing type-checks it either way.
            const ext = path.extname(dest)
            if (
              ext === '' ||
              ext === '.json' ||
              ext === '.html' ||
              dest.endsWith('.d.ts')
            ) {
              return false
            }
            return !dest.endsWith(mode === 'js' ? '.js' : '.ts')
          })
        expect(wrong, `files with the wrong extension for ${mode}`).toEqual([])
      })

      it(`${fw} (${mode}): no copied file imports anything that was not copied`, () => {
        // The load-bearing one. A relative import that leaves the set is a file `init`
        // drops into a project where it cannot resolve; a bare import the framework's
        // manifest never declares is a module the user's install will not have.
        const declared = declaredBy(fw, mode)
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
  }
})

/**
 * The web package, held to the same rules with one of them sharpened.
 *
 * `init` takes all of this rather than a subset — the package does not exist in the host
 * project until it writes it — so there is no subset arithmetic to check. What is worth
 * checking is the thing the package is *for*: it reads the server's contract through
 * `server/api/v1`, and every type the page sees arrives that way. A web tree that dropped
 * the import would still install, still build and still render, having quietly become a
 * plain Vite app with a client that types nothing.
 */
describe('web manifest', () => {
  for (const mode of MODES) {
    const files = webFiles(mode)

    it(`${mode}: every source path exists in the shipped template`, () => {
      const missing = files.filter(f => !exists(f.src)).map(f => f.src)
      expect(
        missing,
        'template files the manifest names but does not ship',
      ).toEqual([])
    })

    it(`${mode}: writes each destination at most once`, () => {
      const all = files.map(f => f.dest)
      expect(all.length).toBe(new Set(all).size)
    })

    it(`${mode}: every source file carries the mode's extension`, () => {
      // `.d.ts` is exempt for the reason the server-side test gives: it is a type file,
      // not a source file. `index.html` is exempt because nothing the mode configures
      // compiles it — which is why it is per-mode: the copies differ only in the
      // `<script>` tag's extension.
      const wrong = files
        .map(f => f.dest)
        .filter(dest => {
          const ext = path.extname(dest)
          if (
            ext === '' ||
            ext === '.json' ||
            ext === '.html' ||
            dest.endsWith('.d.ts')
          ) {
            return false
          }
          return !dest.endsWith(mode === 'js' ? '.js' : '.ts')
        })
      expect(wrong, `files with the wrong extension for ${mode}`).toEqual([])
    })

    it(`${mode}: imports only what the web package declares`, () => {
      const declared = declaredIn('web/package.json')
      const dests = new Set(files.map(f => f.dest))
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

    it(`${mode}: the installed page calls nothing, the scaffolded one calls the server`, () => {
      // The one file that is not the same in the two contexts, and the reason it cannot be.
      //
      // `create` scaffolds a server with `GET /health`, so its page can call a route and
      // show the projection working. `init` installs beside a server whose route table is
      // empty — `src/api-v1/**` is demo content it does not copy — and a call to a route
      // the contract does not have is a compile error. A page that named one anyway would
      // hand the user a frontend that does not build the moment it lands.
      //
      // Asserted on the code with the comments stripped, because both files describe the
      // call in prose: that is what the installed page is *for*. What it must not do is
      // contain one.
      const pageDest = `src/main.${ext(mode)}`
      const codeOf = (source: string) =>
        source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      const codeOfPage = (files: TemplateFile[]) => {
        const page = files.find(f => f.dest === pageDest)
        expect(page, `the manifest names no ${pageDest}`).toBeDefined()
        return codeOf(read((page as TemplateFile).src))
      }

      expect(codeOfPage(webHostFiles(mode))).not.toContain('req')
      expect(codeOfPage(webFiles(mode))).toContain("req.get('health')")

      // And nothing else about them differs: the two sets are the same list of
      // destinations, sourced from the same trees except for that one entry.
      const host = webHostFiles(mode)
      const scaffold = webFiles(mode)
      expect(host.map(f => f.dest)).toEqual(scaffold.map(f => f.dest))
      expect(
        scaffold.filter((f, i) => f.src !== host[i].src).map(f => f.dest),
      ).toEqual([pageDest])
    })

    it(`${mode}: reads the server's contract through the server package`, () => {
      // The import that is the whole feature. `server` is a `workspace:*` dependency, and
      // the specifier resolves through the server's `exports["./api/v1"]` type condition —
      // no tsconfig `paths`, no project reference, nothing to keep in step by hand.
      expect(declaredIn('web/package.json').has('server')).toBe(true)

      const readers = files.filter(f =>
        importsIn(read(f.src)).some(spec => packageOf(spec) === 'server'),
      )
      expect(
        readers.map(f => f.dest),
        'web files importing the server contract',
      ).not.toEqual([])
    })
  }
})
