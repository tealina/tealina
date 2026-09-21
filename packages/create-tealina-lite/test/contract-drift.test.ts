import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * T2 — the contract layer exists twice (this package ships its own mother copy), and
 * two copies that must agree will not agree forever by accident.
 *
 * This test declares the differences instead of hoping there are none. It checks both
 * directions:
 *
 *   - every difference between the two copies is one this file declares, and
 *   - every declared difference is still a difference upstream — so if create-tealina
 *     fixes one of them itself, this test goes red and the delta gets deleted rather
 *     than lingering as a lie in a comment.
 *
 * Scope is the contract proper: `types/**` plus each framework's `convention.ts`. That
 * second half carries no delta at all — the public-route marker lives outside it, in
 * `src/app/middlewares/auth/openHandler.ts`, which upstream has no counterpart for, so
 * there is nothing to compare it against. `src/api-v1/**` is deliberately excluded —
 * that is demo content, and it is covered from the other side by test/contract.test.ts,
 * which compiles it. Divergence there is loud (different endpoints, different types)
 * rather than silent, so it needs no whitelist. `package.json`, `tsconfig*`,
 * `tealina.config.ts`, `src/app/**` and `src/index.ts` are excluded because they are
 * meant to differ.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../..')
const liteTemplate = path.resolve(here, '../template')
const upstreamTemplate = path.join(repoRoot, 'packages/create-tealina/template')

const FRAMEWORKS = ['express', 'fastify', 'koa'] as const

type Delta = {
  /** Path relative to each template root. */
  file: string
  /** The upstream text. */
  from: string
  /** What this package ships instead. */
  to: string
}

/**
 * The tail of upstream's `handler.d.ts`. The global namespace delta is anchored on it
 * rather than on the empty string: `expect(upstream.includes(''))` holds no matter what,
 * so an empty `from` would make the "still needed" check below vacuous.
 */
const MAKE_EXAMPLES = [
  'export type MakeExamplesType<T> = T extends HandlerAlias<infer P, any>',
  '  ? RemapToExampleType<DocTargetFirst<P>>',
  '  : never',
].join('\n')

/**
 * What this package appends: the type names a JavaScript handler writes instead of a
 * relative `import(…)` chain. `VariantPayload` is module-private upstream, which is why
 * the aliases need `extends` here at all — leaving it off compiles under every tsconfig
 * this package ships (`skipLibCheck: true` everywhere) and fails everywhere else.
 */
const GLOBAL_NAMESPACE = [
  '// delta vs create-tealina: global aliases for JavaScript handlers, which have no',
  '// `import type` and would otherwise repeat a relative import chain in every file.',
  '// `EmptyObj` is declared again here only to make the name reachable without an import;',
  '// it is the same type as the one this file exports above.',
  'declare global {',
  '  type EmptyObj = {}',
  '',
  '  type OpenAPI<',
  '    TPayload extends VariantPayload = EmptyObj,',
  '    TResponse = unknown,',
  '  > = OpenHandler<TPayload, TResponse>',
  '',
  '  type AuthedAPI<',
  '    TPayload extends VariantPayload = EmptyObj,',
  '    TResponse = unknown,',
  '  > = AuthedHandler<TPayload, TResponse>',
  '}',
].join('\n')

/**
 * The rule the reorganised `handler.d.ts` draws between its sections. Built here rather
 * than typed out below so the dash count cannot drift between the shipped file and the
 * deltas, where one dash too few is a mismatch whose diff says nothing about the cause.
 */
const RULE = `// ${'-'.repeat(75)}`
const section = (title: string) => [RULE, `// ${title}`, RULE].join('\n')

/**
 * Each `to` carries a `delta vs create-tealina:` comment in the shipped file saying why.
 * When upstream adopts one of these, delete the entry — this test will insist.
 */
const DELTAS: Delta[] = [
  {
    file: 'common/types/handler.d.ts',
    from: [
      'import type {',
      '  LastElement,',
      '  MultiTarget,',
      '  PickTarget,',
      '  RemapToExampleType,',
      '  Simplify,',
      '  TargetKeys,',
      "} from '@tealina/utility-types'",
    ].join('\n'),
    to: [
      '// delta vs create-tealina: taken from `tealina/utility-types` rather than from',
      '// `@tealina/utility-types` directly, so the scaffold installs one package to compile its',
      '// contract instead of two. `tealina` is already a devDependency here for the CLI, and it',
      '// re-exports these. See test/contract-drift.test.ts.',
      'import type {',
      '  LastElement,',
      '  MultiTarget,',
      '  PickTarget,',
      '  RemapToExampleType,',
      '  Simplify,',
      '  TargetKeys,',
      "} from 'tealina/utility-types'",
    ].join('\n'),
  },
  // The reorder, declared as the two rotations it actually is. A reorder cannot be said in
  // a small delta — every line outside a declared region has to stay upstream's byte for
  // byte — so these two regions are as narrow as the move allows. Nothing in either `to` is
  // a new line: they are the same declarations in the shipped order.
  //
  // `EmptyObj` rides along inside the first region, which is why the entry that used to
  // declare its `export` keyword on its own is gone. That is forced, not a preference: any
  // delta spanning the move contains that line, so a separate entry for it would be
  // destroyed by whichever of the two ran second. `undoDeltas` replaces the first
  // occurrence only, and throws when a `to` has gone missing.
  {
    file: 'common/types/handler.d.ts',
    from: [
      'interface RawPayload {',
      '  body?: unknown',
      '  params?: unknown',
      '  query?: unknown',
      '  headers?: unknown',
      '}',
      '',
      'export type FullInfo = RawPayload & { response: unknown }',
      '',
      'type EmptyLocals = {}',
      'type EmptyObj = {}',
      'type ShapeOfMultiTarget = MultiTarget<Record<TargetKeys, any>>',
      'type VariantPayload = RawPayload | ShapeOfMultiTarget',
      '',
      "export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'",
    ].join('\n'),
    to: [
      section('Shapes everything else in this file is built on'),
      '',
      'interface RawPayload {',
      '  body?: unknown',
      '  params?: unknown',
      '  query?: unknown',
      '  headers?: unknown',
      '}',
      '',
      'type ShapeOfMultiTarget = MultiTarget<Record<TargetKeys, any>>',
      'type VariantPayload = RawPayload | ShapeOfMultiTarget',
      '',
      'type EmptyLocals = {}',
      '// delta vs create-tealina: exported here. Upstream keeps it module-local and the demo',
      '// handlers import it anyway, which only compiles because TypeScript does not check',
      '// exports of a `.d.ts` module. See test/contract-drift.test.ts.',
      'export type EmptyObj = {}',
      '',
      'export type FullInfo = RawPayload & { response: unknown }',
      '',
      "export type HTTPMethods = 'get' | 'post' | 'patch' | 'delete'",
      '',
      section('The handler declarations'),
    ].join('\n'),
  },
  {
    file: 'common/types/handler.d.ts',
    from: [
      'type ExtractApiType<',
      '  T,',
      '  K extends TargetKeys,',
      '> = LastElement<T> extends HandlerAlias<infer Info, any>',
      "  ? PickTarget<Omit<Info, 'response'>, K> & {",
      "      response: PickTarget<Info['response'], K>",
      '    }',
      '  : never',
      '',
      'export type ResolveApiTypeForDoc<',
      '  T extends Record<string, Promise<{ default: unknown }>>,',
      '> = {',
      "  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'doc'>",
      '}',
      '',
      'export type ResolveApiTypeForClient<',
      '  T extends Record<string, Promise<{ default: unknown }>>,',
      '> = {',
      "  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'client'>",
      '}',
      '',
      'export type CustomHandlerType = HandlerAlias<any, any>',
    ].join('\n'),
    to: [
      'export type CustomHandlerType = HandlerAlias<any, any>',
      '',
      section('Projections: what the doc generator and the client read'),
      '',
      'type ExtractApiType<',
      '  T,',
      '  K extends TargetKeys,',
      '> = LastElement<T> extends HandlerAlias<infer Info, any>',
      "  ? PickTarget<Omit<Info, 'response'>, K> & {",
      "      response: PickTarget<Info['response'], K>",
      '    }',
      '  : never',
      '',
      'export type ResolveApiTypeForDoc<',
      '  T extends Record<string, Promise<{ default: unknown }>>,',
      '> = {',
      "  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'doc'>",
      '}',
      '',
      'export type ResolveApiTypeForClient<',
      '  T extends Record<string, Promise<{ default: unknown }>>,',
      '> = {',
      "  [K in keyof T]: ExtractApiType<Awaited<T[K]>['default'], 'client'>",
      '}',
    ].join('\n'),
  },
  {
    file: 'common/types/common.d.ts',
    from: [
      'export type ModelId = {',
      '  id: number',
      '}',
      '',
      'export type FindManyArgs = {',
      '  skip?: number',
      '  take?: number',
      '  where?: Record<string, unknown>',
      '}',
      '',
      'export interface PageResult<T> {',
      '  datas: T[]',
      '  total: number',
      '}',
      '',
      'export type AuthedLocals = {',
    ].join('\n'),
    to: [
      '// delta vs create-tealina: `ModelId` / `FindManyArgs` / `PageResult` are dropped here.',
      '// They describe Prisma query shapes, and this scaffold has no database — keeping them',
      '// would read as "there is a data layer you have not found yet".',
      '',
      'export type AuthedLocals = {',
    ].join('\n'),
  },
  {
    file: 'common/types/handler.d.ts',
    from: MAKE_EXAMPLES,
    to: [
      MAKE_EXAMPLES,
      '',
      section('Global aliases'),
      '',
      GLOBAL_NAMESPACE,
    ].join('\n'),
  },
  {
    file: 'server/express/types/alias.d.ts',
    from: [
      'import {',
      '  ExtractResponse,',
      '  MaybeProperty,',
      '  PickTarget,',
      "} from '@tealina/utility-types'",
    ].join('\n'),
    to: [
      '// delta vs create-tealina: taken from `tealina/utility-types` rather than from',
      '// `@tealina/utility-types` directly, so the scaffold installs one package to compile its',
      '// contract instead of two. See test/contract-drift.test.ts.',
      'import {',
      '  ExtractResponse,',
      '  MaybeProperty,',
      '  PickTarget,',
      "} from 'tealina/utility-types'",
    ].join('\n'),
  },
  {
    file: 'server/express/types/alias.d.ts',
    from: 'interface HandlerAliasCore<',
    to: [
      '// delta vs create-tealina: exported here. Upstream omits the keyword on this one file',
      '// (koa and fastify both export it) and `handler.d.ts` imports it regardless — which',
      '// only compiles because TypeScript does not check exports of a `.d.ts` module.',
      'export interface HandlerAliasCore<',
    ].join('\n'),
  },
  // The overload every framework's alias carries, so that a JavaScript handler can name its
  // type in a JSDoc `@type` above the declaration. Upstream's single signature makes that
  // tag the function's own signature, and `async` is then rejected (TS1065) because the
  // return type is not the global `Promise` — express's `unknown`, koa's `void` and
  // fastify's `R | void | Promise<R | void>` all are not. Repeating the signature verbatim
  // is deliberate: a narrower second signature such as `Promise<void>` would keep `async`
  // working and start rejecting the sync handlers the contract accepts today.
  //
  // `from` here is the whole tail of the interface, closing brace included, because the
  // overload is appended to the end of it — nothing else pins the insertion point, and a
  // `from` that stopped at the signature would match the second copy too.
  {
    file: 'server/express/types/alias.d.ts',
    from: [
      '  (',
      "    req: Request<T['params'], R, T['body'], T['query']> &",
      "      MaybeProperty<T['headers'], 'headers'>,",
      '    res: Response<R, TLocals>,',
      '    next: NextFunction,',
      '  ): unknown',
      '}',
    ].join('\n'),
    to: [
      '  (',
      "    req: Request<T['params'], R, T['body'], T['query']> &",
      "      MaybeProperty<T['headers'], 'headers'>,",
      '    res: Response<R, TLocals>,',
      '    next: NextFunction,',
      '  ): unknown',
      '  // delta vs create-tealina: the same signature, a second time, so that this is',
      '  // an overload set. A JavaScript handler annotated with a JSDoc `@type` above',
      '  // its declaration is otherwise checked against the alias as one signature,',
      "  // which makes that signature the function's own — and an `async` handler is",
      '  // then rejected outright, because `unknown` is not the global `Promise`',
      '  // (TS1065). Repeating the signature verbatim is the point: anything narrower,',
      '  // such as `Promise<void>`, is also one signature of an overload set, and',
      '  // would reject the sync handlers this contract accepts today.',
      '  (',
      "    req: Request<T['params'], R, T['body'], T['query']> &",
      "      MaybeProperty<T['headers'], 'headers'>,",
      '    res: Response<R, TLocals>,',
      '    next: NextFunction,',
      '  ): unknown',
      '}',
    ].join('\n'),
  },
  {
    file: 'server/koa/types/alias.d.ts',
    from: "import type { PickTarget, ExtractResponse } from '@tealina/utility-types'",
    to: [
      '// delta vs create-tealina: taken from `tealina/utility-types` rather than from',
      '// `@tealina/utility-types` directly, so the scaffold installs one package to compile its',
      '// contract instead of two. See test/contract-drift.test.ts.',
      "import type { PickTarget, ExtractResponse } from 'tealina/utility-types'",
    ].join('\n'),
  },
  {
    file: 'server/koa/types/alias.d.ts',
    from: [
      '  (',
      '    ctx: ExtendableContext & {',
      '      request: T',
      '    } & { body: ExtractResponse<R> } & {',
      '      state: TLocals',
      '    },',
      '    next: () => Promise<any>,',
      '  ): void',
      '}',
    ].join('\n'),
    to: [
      '  (',
      '    ctx: ExtendableContext & {',
      '      request: T',
      '    } & { body: ExtractResponse<R> } & {',
      '      state: TLocals',
      '    },',
      '    next: () => Promise<any>,',
      '  ): void',
      '  // delta vs create-tealina: the same signature, a second time, so that this is',
      '  // an overload set. A JavaScript handler annotated with a JSDoc `@type` above',
      '  // its declaration is otherwise checked against the alias as one signature,',
      "  // which makes that signature the function's own — and an `async` handler is",
      '  // then rejected outright, because `void` is not the global `Promise`',
      '  // (TS1065). Repeating the signature verbatim is the point: anything narrower,',
      '  // such as `Promise<void>`, is also one signature of an overload set, and',
      '  // would reject the sync handlers this contract accepts today.',
      '  (',
      '    ctx: ExtendableContext & {',
      '      request: T',
      '    } & { body: ExtractResponse<R> } & {',
      '      state: TLocals',
      '    },',
      '    next: () => Promise<any>,',
      '  ): void',
      '}',
    ].join('\n'),
  },
  {
    file: 'server/fastify/types/alias.d.ts',
    from: [
      'import type {',
      '  PickTarget,',
      '  ExtractResponse,',
      '  MaybeProperty,',
      "} from '@tealina/utility-types'",
    ].join('\n'),
    to: [
      '// delta vs create-tealina: taken from `tealina/utility-types` rather than from',
      '// `@tealina/utility-types` directly, so the scaffold installs one package to compile its',
      '// contract instead of two. See test/contract-drift.test.ts.',
      'import type {',
      '  PickTarget,',
      '  ExtractResponse,',
      '  MaybeProperty,',
      "} from 'tealina/utility-types'",
    ].join('\n'),
  },
  {
    file: 'server/fastify/types/alias.d.ts',
    from: [
      '  (',
      '    this: FastifyInstance,',
      "    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop",
      '    reply: FastifyReply<RouteGeneric>,',
      '  ): R | void | Promise<R | void>',
      '}',
    ].join('\n'),
    to: [
      '  (',
      '    this: FastifyInstance,',
      "    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop",
      '    reply: FastifyReply<RouteGeneric>,',
      '  ): R | void | Promise<R | void>',
      '  // delta vs create-tealina: the same signature, a second time, so that this is',
      '  // an overload set. A JavaScript handler annotated with a JSDoc `@type` above',
      '  // its declaration is otherwise checked against the alias as one signature,',
      "  // which makes that signature the function's own — and an `async` handler is",
      '  // then rejected outright, because a promise union is not the global `Promise`',
      '  // (TS1065). Repeating the signature verbatim is the point: anything narrower,',
      '  // such as `Promise<R | void>`, is also one signature of an overload set, and',
      '  // would reject a handler that returns its payload instead of awaiting',
      '  // `reply.send`.',
      '  (',
      '    this: FastifyInstance,',
      "    request: FastifyRequest<RouteGeneric> & MaybeProperty<TLocals, 'locals'>, // extend `locals` prop",
      '    reply: FastifyReply<RouteGeneric>,',
      '  ): R | void | Promise<R | void>',
      '}',
    ].join('\n'),
  },
]

/** Files under `dir` with the given extension, as paths relative to `dir`. */
const listFiles = (dir: string, ext: string): string[] => {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return listFiles(full, ext).map(rel => path.join(entry.name, rel))
      }
      return entry.name.endsWith(ext) ? [entry.name] : []
    })
    .sort()
}

/** The contract files this test holds the two copies to. */
const scope = (templateRoot: string): Record<string, string> => {
  const files: Record<string, string> = {}
  const add = (rel: string) => {
    files[rel] = fs.readFileSync(path.join(templateRoot, rel), 'utf-8')
  }
  for (const rel of listFiles(
    path.join(templateRoot, 'common/types'),
    '.d.ts',
  )) {
    add(path.join('common/types', rel))
  }
  for (const fw of FRAMEWORKS) {
    for (const rel of listFiles(
      path.join(templateRoot, `server/${fw}/types`),
      '.d.ts',
    )) {
      add(path.join(`server/${fw}/types`, rel))
    }
    add(`server/${fw}/src/convention.ts`)
  }
  return files
}

/**
 * Rewrites this package's copy back into what upstream should look like, by undoing
 * every declared delta. If the result is not upstream byte for byte, something changed
 * that this file does not know about.
 */
const undoDeltas = (file: string, content: string) => {
  let out = content
  for (const delta of DELTAS.filter(d => d.file === file)) {
    if (!out.includes(delta.to)) {
      throw new Error(
        `${file}: this file no longer contains the text declared for its delta, so the ` +
          `delta is stale. Expected to find:\n${delta.to}`,
      )
    }
    out = out.replace(delta.to, delta.from)
  }
  return out
}

describe('shipped contract layer vs create-tealina', () => {
  it('has both template roots where we expect them', () => {
    expect(fs.existsSync(liteTemplate), `missing ${liteTemplate}`).toBe(true)
    expect(fs.existsSync(upstreamTemplate), `missing ${upstreamTemplate}`).toBe(
      true,
    )
  })

  it('covers the same set of contract files', () => {
    expect(Object.keys(scope(liteTemplate))).toEqual(
      Object.keys(scope(upstreamTemplate)),
    )
  })

  for (const rel of Object.keys(scope(upstreamTemplate))) {
    it(`${rel} differs only by a declared delta`, () => {
      const lite = fs.readFileSync(path.join(liteTemplate, rel), 'utf-8')
      const upstream = fs.readFileSync(
        path.join(upstreamTemplate, rel),
        'utf-8',
      )
      expect(undoDeltas(rel, lite)).toBe(upstream)
    })
  }

  it('every declared delta is still needed', () => {
    for (const delta of DELTAS) {
      const lite = fs.readFileSync(path.join(liteTemplate, delta.file), 'utf-8')
      const upstream = fs.readFileSync(
        path.join(upstreamTemplate, delta.file),
        'utf-8',
      )
      // If upstream has adopted the change, this stops holding and the delta should go.
      expect(
        upstream.includes(delta.from),
        `${delta.file}: upstream no longer contains the text this delta was written ` +
          `against — it may have fixed it itself. Delete this entry:\n${delta.from}`,
      ).toBe(true)
      expect(
        lite.includes(delta.to),
        `${delta.file}: this package no longer contains its own delta text`,
      ).toBe(true)
    }
  })
})
