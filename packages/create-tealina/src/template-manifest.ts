import type { ServerTemplate } from './core.js'

/**
 * Which package a template file is copied into. The backend is three packages, and the
 * destination of a file is relative to the package named here.
 *
 * `core` holds the contract layer and the framework-specific access module; `api-v1`
 * holds one api version's route tree, its documents and the code that mounts them;
 * `server` is the host — the app, its port, and its static assets.
 */
export type Pkg = 'core' | 'api-v1' | 'server' | 'web'

/**
 * A file the scaffold writes, as a `{src, dest}` pair.
 *
 * The pair rather than a bare path, because the two are not always the same string: the
 * tsconfigs and type files are shared with the other trees, and a JavaScript project's
 * config sits in a sibling directory.
 */
export interface TemplateFile {
  /** Relative to `templateRootDir`. */
  src: string
  /** Relative to the package directory (`backend/<pkg>`). */
  dest: string
  pkg: Pkg
}

/** Which language tree a file comes from. */
export type Mode = 'ts' | 'js'

const extOf = (mode: Mode) => (mode === 'js' ? '.js' : '.ts')

const treeOf = (pkg: Pkg, fw: ServerTemplate, mode: Mode) =>
  `${pkg}/${fw}${mode === 'js' ? '-js' : ''}`

/** The sibling directory a JavaScript project's common files live in. */
const commonTreeOf = (mode: Mode) => (mode === 'js' ? 'common/js' : 'common')

const file = (pkg: Pkg, src: string, dest: string): TemplateFile => ({
  pkg,
  src,
  dest,
})

// ---------------------------------------------------------------------------
// Files every package gets
// ---------------------------------------------------------------------------

/**
 * The same compiler configuration in all three packages.
 *
 * One file rather than three, because there is nothing about `core`, `api-v1` and
 * `server` that asks for different compiler options: each has `src/`, and the include
 * patterns that match nothing in one of them cost nothing. The build config is separate
 * only because it emits.
 */
const kConfigFiles: Record<Mode, readonly string[]> = {
  ts: ['tsconfig.json', 'tsconfig.build.json'],
  js: ['tsconfig.json'],
}

const configFiles = (pkg: Pkg, mode: Mode): TemplateFile[] =>
  kConfigFiles[mode].map(dest =>
    file(pkg, `${commonTreeOf(mode)}/${dest}`, dest),
  )

// ---------------------------------------------------------------------------
// template/core/<fw>[-js]/
// ---------------------------------------------------------------------------

/**
 * Shipped by both modes, byte for byte.
 *
 * A `.d.ts` has no runtime, so the two modes genuinely share the contract layer rather
 * than each having a spelling of its own. `handler.d.ts` imports `./alias.js`; the two
 * files sit beside each other in the package, as they always have.
 */
const kCoreSharedTypes = ['types/handler.d.ts', 'types/common.d.ts'] as const

/** Value-level files, named without their extension. */
const kCoreSourceFiles = ['src/access/index', 'src/access/verifyToken'] as const

export const coreFiles = (fw: ServerTemplate, mode: Mode): TemplateFile[] => [
  ...configFiles('core', mode),
  ...kCoreSharedTypes.map(dest => file('core', `common/core/${dest}`, dest)),
  file('core', `${treeOf('core', fw, mode)}/package.json`, 'package.json'),
  file(
    'core',
    `${treeOf('core', fw, mode)}/types/alias.d.ts`,
    'types/alias.d.ts',
  ),
  // Fastify's `alias.d.ts` augments `FastifyRequest` from a sibling file every program
  // that reads the alias has to reach. The JavaScript tree's alias imports the same
  // `./fastify.js`, so the file comes from the TypeScript tree in both modes.
  ...(fw === 'fastify'
    ? [file('core', 'core/fastify/types/fastify.d.ts', 'types/fastify.d.ts')]
    : []),
  ...kCoreSourceFiles.map(bare =>
    file(
      'core',
      `${treeOf('core', fw, mode)}/${bare}${extOf(mode)}`,
      `${bare}${extOf(mode)}`,
    ),
  ),
]

// ---------------------------------------------------------------------------
// template/api-v1/<fw>[-js]/
// ---------------------------------------------------------------------------

/**
 * The route tree, the generated barrels, and the three files that turn them into a
 * mounted api version: `router` registers one version's routes, `doc` serves the page and
 * its json, and `mount` puts both on the framework instance.
 */
const kApiV1SourceFiles = [
  'src/api/get/health',
  'src/api/get/index',
  'src/api/index',
  'src/api/post/article',
  'src/api/post/index',
  'src/api/post/login',
  'src/doc',
  'src/mount',
  'src/router',
] as const

/** Shared by both modes: the contract's exit point, the prefix constants and the docs. */
const apiV1Shared = (mode: Mode): TemplateFile[] => [
  file('api-v1', 'common/api-v1/types/api.d.ts', 'types/api.d.ts'),
  file('api-v1', 'common/api-v1/version.js', 'version.js'),
  file('api-v1', 'common/api-v1/version.d.ts', 'version.d.ts'),
  file('api-v1', 'common/api-v1/docs/.gitkeep', 'docs/.gitkeep'),
  file('api-v1', 'common/api-v1/AGENTS.md', 'AGENTS.md'),
  file(
    'api-v1',
    `${commonTreeOf(mode)}/api-v1/tealina.config${extOf(mode)}`,
    `tealina.config${extOf(mode)}`,
  ),
]

export const apiV1Files = (fw: ServerTemplate, mode: Mode): TemplateFile[] => [
  ...configFiles('api-v1', mode),
  ...apiV1Shared(mode),
  file('api-v1', `${treeOf('api-v1', fw, mode)}/package.json`, 'package.json'),
  ...kApiV1SourceFiles.map(bare =>
    file(
      'api-v1',
      `${treeOf('api-v1', fw, mode)}/${bare}${extOf(mode)}`,
      `${bare}${extOf(mode)}`,
    ),
  ),
]

// ---------------------------------------------------------------------------
// template/server/<fw>[-js]/
// ---------------------------------------------------------------------------

/** The two files that are shared with the package root rather than living in `src/`. */
const serverRootFiles = (mode: Mode): TemplateFile[] => [
  file('server', 'common/server/.env.example', '.env.example'),
  file('server', 'common/server/public/index.html', 'public/index.html'),
  file(
    'server',
    `common/server/src/config/env${extOf(mode)}`,
    `src/config/env${extOf(mode)}`,
  ),
]

const kServerSourceFiles = [
  'src/app',
  'src/index',
  'src/routes/static/assets',
] as const

export const serverFiles = (fw: ServerTemplate, mode: Mode): TemplateFile[] => [
  ...configFiles('server', mode),
  ...serverRootFiles(mode),
  file('server', `${treeOf('server', fw, mode)}/package.json`, 'package.json'),
  ...kServerSourceFiles.map(bare =>
    file(
      'server',
      `${treeOf('server', fw, mode)}/${bare}${extOf(mode)}`,
      `${bare}${extOf(mode)}`,
    ),
  ),
]

/** Every backend file `create` writes, in the order it writes it. */
export const backendFiles = (
  fw: ServerTemplate,
  mode: Mode,
): TemplateFile[] => [
  ...coreFiles(fw, mode),
  ...apiV1Files(fw, mode),
  ...serverFiles(fw, mode),
]

// ---------------------------------------------------------------------------
// template/web[/js]/
// ---------------------------------------------------------------------------

/**
 * The frontend is opt-in: a tealina project is the backend, and the client is whichever
 * one you already have. It is a Vite project with no framework — the point is the
 * projection, not the UI.
 */

/** Written identically by both modes: the package manifest says nothing about types. */
const kWebShared = ['package.json'] as const

/** Per mode under the same name — neither filename carries the mode. */
const kWebNamed = ['index.html', 'tsconfig.json'] as const

/** Per mode, named without the extension the mode gives it. */
const kWebPerMode = ['vite.config', 'src/api/client', 'src/main'] as const

/**
 * Files only one tree has, under their literal name — no `extOf`, because a `.d.ts`
 * spells its own type. The `Take*` names are a JavaScript convenience: the TypeScript
 * tree has them in `src/api/client`.
 */
const kWebModeOnly: Record<Mode, readonly string[]> = {
  ts: [],
  js: ['types/api.d.ts'],
}

const webTreeOf = (mode: Mode) => (mode === 'js' ? 'web/js' : 'web')

export const webFiles = (mode: Mode): TemplateFile[] => [
  ...kWebShared.map(dest => ({
    pkg: 'web' as const,
    src: `web/${dest}`,
    dest,
  })),
  ...[
    ...kWebNamed,
    ...kWebModeOnly[mode],
    ...kWebPerMode.map(bare => `${bare}${extOf(mode)}`),
  ].map(dest => ({
    pkg: 'web' as const,
    src: `${webTreeOf(mode)}/${dest}`,
    dest,
  })),
]
