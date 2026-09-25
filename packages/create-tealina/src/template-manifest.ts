import type { ServerTemplate } from './core.js'

/**
 * The template files both entry points copy, listed once.
 *
 * These used to be two views of the same tree. `create` copied `template/common/` and
 * `template/server/<fw>/` wholesale; `init` carried a curated list of its own. A file could
 * be added to one and missed in the other, and nothing would say so — the cost lands later,
 * as an import that does not resolve inside someone's project. The tree is one tree, so it
 * is written down once here and `init` selects from it.
 *
 * A `{src, dest}` pair rather than a bare path, because the two are not always the same
 * string: a JavaScript project's config sits in a sibling directory, and the type files are
 * shared with the TypeScript tree rather than copied into it.
 */
export interface TemplateFile {
  /** Relative to `templateRootDir`. */
  src: string
  /** Relative to the package the file is copied into. */
  dest: string
}

/**
 * Which of the two trees a file comes from.
 *
 * The mode is a required argument everywhere rather than a defaulted one: "which tree" is
 * the whole question this file answers, and a call site that forgets to say would get a
 * TypeScript file with no complaint from anything.
 */
export type Mode = 'ts' | 'js'

/** The tree a mode's value-level files live in. */
const treeOf = (fw: ServerTemplate, mode: Mode) =>
  mode === 'js' ? `server/${fw}-js` : `server/${fw}`

/**
 * What a source file in this mode is called. The two trees hold the same files under the
 * same names; only the extension and the type syntax differ, which is what makes a diff
 * between them readable.
 */
const extOf = (mode: Mode) => (mode === 'js' ? '.js' : '.ts')

/** The sibling directory a JavaScript project's common files live in. */
const commonTreeOf = (mode: Mode) => (mode === 'js' ? 'common/js' : 'common')

// ---------------------------------------------------------------------------
// template/common/
// ---------------------------------------------------------------------------

/**
 * Shipped by both modes, byte for byte. The contract layer is the point of that: a
 * `.d.ts` has no runtime, so the two modes genuinely share these files rather than each
 * having a spelling of its own.
 */
const kCommonShared = [
  '.env.example',
  'docs/.gitkeep',
  'public/index.html',
  'types/api-v1.d.ts',
  'types/common.d.ts',
  'types/handler.d.ts',
] as const

/**
 * Value-level common files that exist once per mode, named without their extension:
 * `src/config/env` is `env.ts` in one tree and `env.js` in the other, and so is the
 * config — which is exactly why a JavaScript project does not need a TypeScript file to
 * be configured.
 */
const kCommonPerMode = ['src/config/env', 'tealina.config'] as const

/** The config files, whose *names* also differ: a JavaScript project has no build. */
const kCommonConfig: Record<Mode, readonly string[]> = {
  ts: ['tsconfig.json', 'tsconfig.build.json'],
  js: ['tsconfig.json'],
}

export const commonFiles = (mode: Mode): TemplateFile[] => [
  ...kCommonShared.map(dest => ({ src: `common/${dest}`, dest })),
  ...kCommonPerMode.map(bare => ({
    src: `${commonTreeOf(mode)}/${bare}${extOf(mode)}`,
    dest: `${bare}${extOf(mode)}`,
  })),
  ...kCommonConfig[mode].map(dest => ({
    src: `${commonTreeOf(mode)}/${dest}`,
    dest,
  })),
]

// ---------------------------------------------------------------------------
// template/server/<fw>[-js]/
// ---------------------------------------------------------------------------

/** Value-level files, named without their extension. */
const kFrameworkSourceFiles: Record<ServerTemplate, readonly string[]> = {
  express: [
    'src/api-v1/get/health',
    'src/api-v1/get/index',
    'src/api-v1/index',
    'src/api-v1/post/article',
    'src/api-v1/post/index',
    'src/api-v1/post/login',
    'src/app/index',
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/assets',
    'src/app/routes/static/doc',
    'src/convention',
    'src/index',
  ],
  koa: [
    'src/api-v1/get/health',
    'src/api-v1/get/index',
    'src/api-v1/index',
    'src/api-v1/post/article',
    'src/api-v1/post/index',
    'src/api-v1/post/login',
    'src/app/index',
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/assets',
    'src/app/routes/static/docs',
    'src/convention',
    'src/index',
  ],
  fastify: [
    'src/api-v1/get/health',
    'src/api-v1/get/index',
    'src/api-v1/index',
    'src/api-v1/post/article',
    'src/api-v1/post/index',
    'src/api-v1/post/login',
    'src/app/index',
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/assets',
    'src/app/routes/static/docs',
    'src/convention',
    'src/index',
  ],
}

/** Written by both modes under the same name. */
const kFrameworkStaticFiles = ['package.json'] as const

/**
 * Each framework's half of the contract layer. Shared with the TypeScript tree instead of
 * being copied into the JavaScript one: this is the file the whole projection hangs off —
 * get it wrong and every response silently widens — so two copies of it would be two
 * things to keep in step, with the drift showing up as a wrong document rather than as an
 * error. `common/types/**` is shared the same way, one level up.
 */
const kFrameworkTypeFiles: Record<ServerTemplate, readonly string[]> = {
  express: ['types/alias.d.ts'],
  koa: ['types/alias.d.ts'],
  fastify: ['types/alias.d.ts', 'types/fastify.d.ts'],
}

export const frameworkFiles = (
  fw: ServerTemplate,
  mode: Mode,
): TemplateFile[] => [
  ...kFrameworkStaticFiles.map(dest => ({
    src: `${treeOf(fw, mode)}/${dest}`,
    dest,
  })),
  ...kFrameworkSourceFiles[fw].map(bare => {
    const dest = `${bare}${extOf(mode)}`
    return { src: `${treeOf(fw, mode)}/${dest}`, dest }
  }),
  ...kFrameworkTypeFiles[fw].map(dest => ({
    src: `server/${fw}/${dest}`,
    dest,
  })),
]

/** What `create` copies into the server package, in the order it copies it. */
export const createFiles = (fw: ServerTemplate, mode: Mode): TemplateFile[] => [
  ...commonFiles(mode),
  ...frameworkFiles(fw, mode),
]

// ---------------------------------------------------------------------------
// template/web[/js]/
// ---------------------------------------------------------------------------

/**
 * The frontend is the one part of the scaffold that is not a workspace of its own by
 * default: it is a separate package beside the server, written by `--web` rather than
 * assumed, because a tealina project is the server and the client is whichever one you
 * already have.
 *
 * It is a Vite project with no framework — the point is the projection, not the UI, and a
 * React tree would be nine tenths boilerplate around the one line that matters.
 */

/** Written identically by both modes: the package manifest says nothing about types. */
const kWebShared = ['package.json'] as const

/** Per mode under the same name — neither filename carries the mode. */
const kWebNamed = ['index.html', 'tsconfig.json'] as const

/**
 * Per mode, named without the extension the mode gives it. `index.html` is in the group
 * above rather than this one because it is not a source file: it carries no mode of its
 * own, and the two copies differ only in the `<script>` tag's extension.
 *
 * `src/main` is the one entry not here, because it is the one file whose content depends on
 * the project it lands in rather than on the mode — see `kWebBareMain`.
 */
const kWebPerMode = ['vite.config', 'src/api/client'] as const

/**
 * Files only one tree has, under their literal name — no `extOf`, because a `.d.ts` spells
 * its own type.
 *
 * One entry: the `Take*` names, which a `.js` call site reaches by path. The TypeScript tree
 * has them in `src/api/client`, so the file there would be a competing set of declarations
 * rather than a convenience — hence mode-keyed, not shared.
 */
const kWebModeOnly: Record<Mode, readonly string[]> = {
  ts: [],
  js: ['types/v1.d.ts'],
}

const webTreeOf = (mode: Mode) => (mode === 'js' ? 'web/js' : 'web')

/**
 * The page, in two versions, under one destination.
 *
 * `create` scaffolds a server that ships `GET /health`, so its frontend can call a route
 * and show the projection working end to end. `init` installs beside a server that is
 * whatever it is: `src/api-v1/**` is demo content this command deliberately does not copy,
 * so a host's route table is empty until its owner writes a handler — and a call to a route
 * the contract does not have is a compile error. The installed frontend would not build.
 *
 * So the plain page ships to a host and the demo page ships with the scaffold, and they
 * differ by the one statement that names a route. Everything else about them is the same
 * file, which is why they sit side by side rather than in two trees.
 */
const kWebBareMain = (mode: Mode) => `main${extOf(mode)}`
const kWebDemoMain = (mode: Mode) => `main.demo${extOf(mode)}`

const webMainDest = (mode: Mode) => `src/${kWebBareMain(mode)}`

const kWebRest = (mode: Mode): TemplateFile[] => [
  ...kWebShared.map(dest => ({ src: `web/${dest}`, dest })),
  ...[
    ...kWebNamed,
    ...kWebModeOnly[mode],
    ...kWebPerMode.map(bare => `${bare}${extOf(mode)}`),
  ].map(dest => ({ src: `${webTreeOf(mode)}/${dest}`, dest })),
]

/**
 * What `create --web` copies into the web package.
 *
 * Unlike the server side's `initFiles`, this is the whole package either way: nothing in it
 * is host source that a curated subset would have to step around, because the package does
 * not exist in the host project until one of these writes it. The page is the exception,
 * and only in which of the two versions it is.
 */
export const webFiles = (mode: Mode): TemplateFile[] => [
  ...kWebRest(mode),
  {
    src: `${webTreeOf(mode)}/src/${kWebDemoMain(mode)}`,
    dest: webMainDest(mode),
  },
]

/** The same set, with the page that does not call a route the host has not written yet. */
export const webHostFiles = (mode: Mode): TemplateFile[] =>
  webFiles(mode).map(f =>
    f.dest === webMainDest(mode)
      ? { ...f, src: `${webTreeOf(mode)}/${webMainDest(mode)}` }
      : f,
  )

// ---------------------------------------------------------------------------
// What `init` takes from the same tree
// ---------------------------------------------------------------------------

/**
 * Destinations without the mode's extension — `src/convention` names `convention.ts` and
 * `convention.js` alike, and the `.d.ts` files keep theirs because it is part of the name.
 *
 * The selection below is therefore mode-independent, which is the honest model: *which*
 * files `init` takes has nothing to do with the mode, only what they are called does.
 */
const bareOf = (dest: string) =>
  dest.endsWith('.d.ts') ? dest : dest.replace(/\.(ts|js|mjs|cjs)$/, '')

/**
 * The contract layer, the config, and the docs placeholder. Everything else `create` ships
 * belongs to a project that was scaffolded from scratch: the tsconfigs, `src/config/env`
 * and `public/` are the host's own choices of port, module settings and build.
 */
const kInitFromCommon: ReadonlySet<string> = new Set([
  'docs/.gitkeep',
  'tealina.config',
  'types/api-v1.d.ts',
  'types/common.d.ts',
  'types/handler.d.ts',
])

/**
 * What is absent from these sets matters as much as what is in them:
 *
 * - `src/index` and `src/app/index` are the scaffold's boot and app assembly. This
 *   feature never edits the host's, so it must not drop a competing pair next to them.
 * - `src/api-v1/**` is demo content, and `package.json` is merged rather than copied.
 * - `src/app/routes/static/assets` serves the scaffold's placeholder page.
 */
const kInitFromFramework: Record<ServerTemplate, ReadonlySet<string>> = {
  express: new Set([
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/doc',
    'src/convention',
    'types/alias.d.ts',
  ]),
  koa: new Set([
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/docs',
    'src/convention',
    'types/alias.d.ts',
  ]),
  fastify: new Set([
    'src/app/middlewares/auth/openHandler',
    'src/app/middlewares/auth/verifyToken',
    'src/app/routes/api/index',
    'src/app/routes/api/v1',
    'src/app/routes/static/docs',
    'src/convention',
    'types/alias.d.ts',
    'types/fastify.d.ts',
  ]),
}

export const commonInitFiles = (mode: Mode): TemplateFile[] =>
  commonFiles(mode).filter(f => kInitFromCommon.has(bareOf(f.dest)))

export const frameworkInitFiles = (
  fw: ServerTemplate,
  mode: Mode,
): TemplateFile[] =>
  frameworkFiles(fw, mode).filter(f =>
    kInitFromFramework[fw].has(bareOf(f.dest)),
  )

/**
 * Every file `init` writes for `fw`, as template-relative `src` → package-relative `dest`.
 *
 * Exported because test/init-manifest.test.ts holds invariants over this list that cannot be
 * checked from the outside: that every `src` exists, that every relative import inside the
 * set lands back inside the set, and that the set is really a subset of what `create` ships.
 */
export const initFiles = (fw: ServerTemplate, mode: Mode): TemplateFile[] => [
  ...commonInitFiles(mode),
  ...frameworkInitFiles(fw, mode),
]
