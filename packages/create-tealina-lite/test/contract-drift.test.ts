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
 * Each `to` carries a `delta vs create-tealina:` comment in the shipped file saying why.
 * When upstream adopts one of these, delete the entry — this test will insist.
 */
const DELTAS: Delta[] = [
  {
    file: 'common/types/handler.d.ts',
    from: 'type EmptyObj = {}',
    to: [
      '// delta vs create-tealina: exported here. Upstream keeps it module-local and the demo',
      '// handlers import it anyway, which only compiles because TypeScript does not check',
      '// exports of a `.d.ts` module. See test/contract-drift.test.ts.',
      'export type EmptyObj = {}',
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
    file: 'server/express/types/alias.d.ts',
    from: 'interface HandlerAliasCore<',
    to: [
      '// delta vs create-tealina: exported here. Upstream omits the keyword on this one file',
      '// (koa and fastify both export it) and `handler.d.ts` imports it regardless — which',
      '// only compiles because TypeScript does not check exports of a `.d.ts` module.',
      'export interface HandlerAliasCore<',
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
