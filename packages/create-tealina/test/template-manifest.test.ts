import fs from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { kServerTemplates, templateRootDir } from '../src/core.js'
import {
  type Mode,
  type Pkg,
  type TemplateFile,
  backendFiles,
  webFiles,
} from '../src/template-manifest.js'

/**
 * T4 — the manifest `create` copies from, held still.
 *
 * `create` is nothing but a list of template files plus a copy loop, so the list is the
 * feature. Two things rot it, and neither shows up until a user runs the command against a
 * real directory:
 *
 *   1. a path stops existing when the template is reorganised;
 *   2. a copied file imports something that was not copied — `create` then ships a package
 *      that does not resolve, without touching a single file that would have warned us.
 *
 * The backend is three packages, so "was not copied" is narrower than it used to be: a
 * relative import has to land in the same package, while `core/handler` and `api-v1/mount`
 * are bare specifiers that resolve through a sibling package's `exports` map. Each package's
 * own manifest is the list of those siblings, which is why the import check runs per
 * package rather than over one flat set.
 *
 * Both are pure assertions over the shipped template, so this runs offline in milliseconds.
 */

const MODES: Mode[] = ['ts', 'js']

const exists = (rel: string) => fs.existsSync(path.join(templateRootDir, rel))

const read = (rel: string) =>
  fs.readFileSync(path.join(templateRootDir, rel), 'utf-8')

/**
 * Every `from '...'` and `import('...')` a file really declares.
 *
 * Template literals are stripped first, and that is not tidiness: `tealina.config.ts` is a
 * code generator, so the import lines it *emits* are backtick strings sitting in this file.
 * A raw scan reads them as imports of the config itself, with a `${fileDir}` in the
 * specifier that no path resolver can evaluate. What they emit is a different question — it
 * lands in files `align` generates, not in the copied set.
 *
 * `import(…)` is looked for after stripping only the template literals, because a
 * JavaScript tree reaches its types through a JSDoc `@typedef {import('core/handler')…}` —
 * a comment, and still a dependency.
 */
const importsIn = (source: string) => {
  const noTemplates = source.replace(/`(?:[^`\\]|\\.)*`/g, '')
  const code = noTemplates
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  return [
    ...code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...noTemplates.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map(m => m[1])
}

/**
 * `./x.js` is how these files spell `./x.ts` — the packages are compiled with
 * `moduleResolution: NodeNext`, where the emitted name is the one you write. Try the
 * TypeScript spellings before the literal one; in a JavaScript tree the literal one is a
 * real file rather than a spelling, so both modes resolve through here.
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

const manifestOf = (pkg: Pkg, fw: string, mode: Mode) => {
  if (pkg === 'web') return 'web/package.json'
  return `${pkg}/${fw}${mode === 'js' ? '-js' : ''}/package.json`
}

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

/** The files one package receives, and the dependencies its manifest declares. */
const packageView = (
  files: TemplateFile[],
  pkg: Pkg,
  fw: string,
  mode: Mode,
) => {
  const own = files.filter(f => f.pkg === pkg)
  return {
    own,
    dests: new Set(own.map(f => f.dest)),
    declared: declaredIn(manifestOf(pkg, fw, mode)),
  }
}

const filesFor = (fw: (typeof kServerTemplates)[number], mode: Mode) =>
  backendFiles(fw, mode)

describe('backend manifest', () => {
  for (const mode of MODES) {
    it(`${mode}: every source path exists in the shipped template`, () => {
      const missing = kServerTemplates.flatMap(fw =>
        filesFor(fw, mode)
          .filter(f => !exists(f.src))
          .map(f => f.src),
      )
      expect(
        [...new Set(missing)],
        'template files the manifest names but does not ship',
      ).toEqual([])
    })
  }

  it('names every file the template actually ships', () => {
    // The direction this arrangement makes necessary: the manifest is the only thing
    // `create` copies from, so a file sitting in the template that it does not name is a
    // file that silently stops being shipped. Only a walk of the real directory sees that.
    //
    // The union across modes and frameworks is the honest form of the question: a file
    // named by one tree only still ships — the JavaScript tree's `alias.d.ts` comes from
    // the TypeScript tree — so the union is what this walk has to compare against.
    const named = new Set(
      MODES.flatMap(mode => [
        ...kServerTemplates.flatMap(fw => filesFor(fw, mode).map(f => f.src)),
        ...webFiles(mode).map(f => f.src),
      ]),
    )
    const unnamed = walkTemplate([
      'common',
      'core',
      'api-v1',
      'server',
      'web',
    ]).filter(f => !named.has(f))
    expect(unnamed, 'template files no mode names, so they never ship').toEqual(
      [],
    )
  })

  for (const mode of MODES) {
    for (const fw of kServerTemplates) {
      const files = filesFor(fw, mode)

      it(`${fw} (${mode}): writes each destination at most once per package`, () => {
        for (const pkg of ['core', 'api-v1', 'server'] as const) {
          const dests = files.filter(f => f.pkg === pkg).map(f => f.dest)
          expect(
            dests.length,
            `${pkg} receives the same destination twice`,
          ).toBe(new Set(dests).size)
        }
      })

      it(`${fw} (${mode}): every generated file carries the mode's extension`, () => {
        // A JavaScript tree that shipped a `.ts` file would hand the package a source file
        // its compiler is not configured for; a TypeScript tree that shipped `.js` would
        // hand it one nothing type-checks. The exceptions are the files the mode does not
        // compile at all: `.d.ts` (a type file in both modes), dotfiles, `.json`, `.html`,
        // `.md`, and `version.js` — the shared constants, typed by the sibling
        // `version.d.ts` and deliberately one spelling in both trees.
        const wrong = files
          .map(f => f.dest)
          .filter(dest => {
            const ext = path.extname(dest)
            if (
              dest.startsWith('.') ||
              dest === 'version.js' ||
              ext === '' ||
              ext === '.json' ||
              ext === '.html' ||
              ext === '.md' ||
              dest.endsWith('.d.ts')
            ) {
              return false
            }
            return !dest.endsWith(mode === 'js' ? '.js' : '.ts')
          })
        expect(wrong, `files with the wrong extension for ${mode}`).toEqual([])
      })

      it(`${fw} (${mode}): no copied file imports anything it was not given`, () => {
        // The load-bearing one. A relative import that leaves its package is a file copied
        // into a package where it cannot resolve; a bare import the package's manifest
        // never declares is a module the user's install will not have. The two sibling
        // packages are bare specifiers too — `core` and `api-v1` are dependencies, not
        // paths — so they go through the same declared set.
        const problems: string[] = []

        for (const pkg of ['core', 'api-v1', 'server'] as const) {
          const { own, dests, declared } = packageView(files, pkg, fw, mode)
          for (const { src, dest: rel } of own) {
            for (const spec of importsIn(read(src))) {
              if (spec.startsWith('.')) {
                if (resolveRel(rel, spec, dests) == null) {
                  problems.push(`${pkg}/${rel} imports ${spec}`)
                }
              } else if (!isBuiltin(spec) && !declared.has(packageOf(spec))) {
                problems.push(
                  `${pkg}/${rel} imports ${spec} (not in its package.json)`,
                )
              }
            }
          }
        }

        expect(problems).toEqual([])
      })

      it(`${fw} (${mode}): a JavaScript tree declares no TypeScript-only syntax`, () => {
        // `import type` is TS8006 in a checked `.js` file, and the JavaScript trees are
        // checked — `tsc --noEmit` is their build. The types come through JSDoc instead.
        if (mode !== 'js') return
        const offenders = files
          .filter(f => f.dest.endsWith('.js'))
          .filter(f => /\bimport\s+type\b/.test(read(f.src)))
          .map(f => f.dest)
        expect(offenders, 'import type in a .js file').toEqual([])
      })
    }
  }
})

/**
 * The web package, held to the same rules with one of them sharpened.
 *
 * What is worth checking beyond "the paths exist" is the thing the package is *for*: it
 * reads the contract through `api-v1/api`, and every type the page sees arrives that way. A
 * web tree that dropped the import would still install, still build and still render,
 * having quietly become a plain Vite app with a client that types nothing.
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
      const dests = files.map(f => f.dest)
      expect(dests.length).toBe(new Set(dests).size)
    })

    it(`${mode}: every source file carries the mode's extension`, () => {
      // `.d.ts` is exempt for the reason the backend test gives: it is a type file, not a
      // source file. `index.html` is exempt because nothing the mode configures compiles
      // it — which is why it is per-mode: the copies differ only in the `<script>` tag's
      // extension.
      const wrong = files
        .map(f => f.dest)
        .filter(dest => {
          const ext = path.extname(dest)
          if (
            dest.startsWith('.') ||
            ext === '' ||
            ext === '.json' ||
            ext === '.html' ||
            ext === '.md' ||
            dest.endsWith('.d.ts')
          ) {
            return false
          }
          return !dest.endsWith(mode === 'js' ? '.js' : '.ts')
        })
      expect(wrong, `files with the wrong extension for ${mode}`).toEqual([])
    })

    it(`${mode}: imports only what the web package declares`, () => {
      const dests = new Set(files.map(f => f.dest))
      const declared = declaredIn('web/package.json')
      const problems: string[] = []

      for (const { src, dest: rel } of files) {
        for (const spec of importsIn(read(src))) {
          if (spec.startsWith('.')) {
            if (resolveRel(rel, spec, dests) == null) {
              problems.push(`${rel} imports ${spec}`)
            }
          } else if (!isBuiltin(spec) && !declared.has(packageOf(spec))) {
            problems.push(`${rel} imports ${spec} (not in its package.json)`)
          }
        }
      }

      expect(problems).toEqual([])
    })

    it(`${mode}: reads the handlers through the api package`, () => {
      // The import that is the whole feature. `api-v1` is a `workspace:*` dependency, and
      // the specifier resolves through its `exports["./api"]` type condition — no
      // tsconfig `paths`, no project reference, nothing to keep in step by hand.
      expect(declaredIn('web/package.json').has('api-v1')).toBe(true)

      const readers = files.filter(f =>
        importsIn(read(f.src)).some(spec => packageOf(spec) === 'api-v1'),
      )
      expect(
        readers.map(f => f.dest),
        'web files importing the api contract',
      ).not.toEqual([])
    })

    it(`${mode}: does not reach into the server package`, () => {
      // The server is host glue now; the frontend has no reason to depend on it, and a
      // specifier that named it would tie the page to a package that never publishes a
      // contract.
      expect(declaredIn('web/package.json').has('server')).toBe(false)

      const offenders = files.filter(f =>
        importsIn(read(f.src)).some(spec => packageOf(spec) === 'server'),
      )
      expect(offenders.map(f => f.dest)).toEqual([])
    })
  }
})
