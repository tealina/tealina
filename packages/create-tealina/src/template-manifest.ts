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
 * tsconfigs and type files are shared with the other framework trees, and a destination
 * is relative to the package while the source is relative to `template/`.
 */
export interface TemplateFile {
  /** Relative to `templateRootDir`. */
  src: string
  /** Relative to the package directory (`backend/<pkg>`). */
  dest: string
  pkg: Pkg
}

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
const kConfigFiles = ['tsconfig.json', 'tsconfig.build.json'] as const

const configFiles = (pkg: Pkg): TemplateFile[] =>
  kConfigFiles.map(dest => file(pkg, `common/${dest}`, dest))

// ---------------------------------------------------------------------------
// template/core/<fw>/
// ---------------------------------------------------------------------------

/**
 * Shared by every framework, byte for byte.
 *
 * A `.d.ts` has no runtime, so the frameworks genuinely share these contract files
 * rather than each having a spelling of its own. `handler.d.ts` imports `./alias.js`; the
 * two files sit beside each other in the package, as they always have.
 */
const kCoreSharedTypes = ['types/handler.d.ts', 'types/common.d.ts'] as const

/** Value-level files, named without their extension. */
const kCoreSourceFiles = ['src/access/index', 'src/access/verifyToken'] as const

export const coreFiles = (fw: ServerTemplate): TemplateFile[] => [
  ...configFiles('core'),
  ...kCoreSharedTypes.map(dest => file('core', `common/core/${dest}`, dest)),
  file('core', `core/${fw}/package.json`, 'package.json'),
  file('core', `core/${fw}/types/alias.d.ts`, 'types/alias.d.ts'),
  // Fastify's `alias.d.ts` augments `FastifyRequest` from a sibling file every program
  // that reads the alias has to reach. Only the fastify tree has that file, so it is
  // named explicitly rather than derived from the framework directory.
  ...(fw === 'fastify'
    ? [file('core', 'core/fastify/types/fastify.d.ts', 'types/fastify.d.ts')]
    : []),
  ...kCoreSourceFiles.map(bare =>
    file('core', `core/${fw}/${bare}.ts`, `${bare}.ts`),
  ),
]

// ---------------------------------------------------------------------------
// template/api-v1/<fw>/
// ---------------------------------------------------------------------------

/**
 * The route tree, the generated barrels, and the three files that turn them into a
 * mounted api version: `router` registers one version's routes, `doc` publishes that
 * version's json, and `mount` puts the routes and the json on the framework instance.
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

/**
 * The contract's exit point, the prefix constants and the docs.
 *
 * `version.js` is the one deliberately literal `.js` file: it is a runtime constant that
 * every package reads, and the sibling `version.d.ts` types it.
 */
const apiV1Shared: readonly TemplateFile[] = [
  file('api-v1', 'common/api-v1/types/api.d.ts', 'types/api.d.ts'),
  file('api-v1', 'common/api-v1/version.js', 'version.js'),
  file('api-v1', 'common/api-v1/version.d.ts', 'version.d.ts'),
  file('api-v1', 'common/api-v1/docs/.gitkeep', 'docs/.gitkeep'),
  file('api-v1', 'common/api-v1/AGENTS.md', 'AGENTS.md'),
  file('api-v1', 'common/api-v1/tealina.config.ts', 'tealina.config.ts'),
]

export const apiV1Files = (fw: ServerTemplate): TemplateFile[] => [
  ...configFiles('api-v1'),
  ...apiV1Shared,
  file('api-v1', `api-v1/${fw}/package.json`, 'package.json'),
  ...kApiV1SourceFiles.map(bare =>
    file('api-v1', `api-v1/${fw}/${bare}.ts`, `${bare}.ts`),
  ),
]

// ---------------------------------------------------------------------------
// template/server/<fw>/
// ---------------------------------------------------------------------------

/** The two files that are shared with the package root rather than living in `src/`. */
const serverRootFiles: readonly TemplateFile[] = [
  file('server', 'common/server/.env.example', '.env.example'),
  file('server', 'common/server/public/index.html', 'public/index.html'),
  file('server', 'common/server/src/config/env.ts', 'src/config/env.ts'),
]

const kServerSourceFiles = [
  'src/app',
  'src/doc',
  'src/index',
  'src/routes/static/assets',
] as const

export const serverFiles = (fw: ServerTemplate): TemplateFile[] => [
  ...configFiles('server'),
  ...serverRootFiles,
  file('server', `server/${fw}/package.json`, 'package.json'),
  ...kServerSourceFiles.map(bare =>
    file('server', `server/${fw}/${bare}.ts`, `${bare}.ts`),
  ),
]

/** Every backend file `create` writes, in the order it writes it. */
export const backendFiles = (fw: ServerTemplate): TemplateFile[] => [
  ...coreFiles(fw),
  ...apiV1Files(fw),
  ...serverFiles(fw),
]

// ---------------------------------------------------------------------------
// template/web/
// ---------------------------------------------------------------------------

/**
 * The frontend is opt-in: a tealina project is the backend, and the client is whichever
 * one you already have. It is a Vite project with no framework — the point is the
 * projection, not the UI.
 */
const kWebFiles = [
  'package.json',
  'index.html',
  'tsconfig.json',
  'vite.config.ts',
  'src/api/client.ts',
  'src/main.ts',
] as const

export const webFiles = (): TemplateFile[] =>
  kWebFiles.map(dest => ({
    pkg: 'web' as const,
    src: `web/${dest}`,
    dest,
  }))
