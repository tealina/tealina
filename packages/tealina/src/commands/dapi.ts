import {
  asyncFlow,
  concat,
  filter,
  flat,
  flow,
  isEmpty,
  map,
  notNull,
  pipe,
} from 'fp-lite'
import { basename, join } from 'pathe'
import { genIndexProp, genTopIndexProp, genWithWrapper } from '../utils/codeGen'
import { Snapshot, completePath, effectFiles } from '../utils/effectFiles'
import { logResults } from '../utils/logResults'
import { FullContext, Seeds, collectContext, seeds2kindScope } from './capi'

const toKeyMapTrue = flow(
  map((x: string) => [x, true] as const),
  kvs => new Map(kvs),
)

const getTopIndexSnapshot = (
  xs: { kind: string }[],
  topIndexContent: string[],
  suffix: string,
): Snapshot =>
  pipe(
    xs,
    map(flow(v => v.kind, genTopIndexProp(suffix))),
    (imps): Snapshot => {
      const existImpMap = toKeyMapTrue(imps)
      const remains = topIndexContent.filter(v => !existImpMap.has(v))
      return {
        group: 'api',
        action: 'update',
        filePath: 'index.ts',
        code: genWithWrapper(remains),
      }
    },
  )

interface KindSummary {
  kind: string
  namePathsArray: string[][]
}

const toIndexSnapshot =
  (kindIndexMap: Map<string, string[]>, suffix: string) =>
  (v: KindSummary): (Snapshot & { kind: string }) | null => {
    const imps = v.namePathsArray.map(pathArr => genIndexProp(suffix)(pathArr))
    const { kind } = v
    const contents = kindIndexMap.get(kind) ?? []
    const remains = contents.filter(v => !imps.includes(v))
    const filePath = join(kind, 'index.ts')
    return isEmpty(remains)
      ? { group: 'api', action: 'delete', filePath, kind }
      : {
          group: 'api',
          action: 'update',
          filePath,
          code: genWithWrapper(remains),
          kind,
        }
  }

const calcByKinds =
  ({ kindIndexContentMap, topIndexContent, suffix }: FullContext) =>
  (kinds: KindSummary[]) => {
    const kindIndexSnapshots = pipe(
      kinds,
      map(toIndexSnapshot(kindIndexContentMap, suffix)),
      filter(notNull),
    )
    const deletedKinds = kindIndexSnapshots.filter(v => v.action == 'delete')
    if (deletedKinds.length < 1) return kindIndexSnapshots
    return [
      getTopIndexSnapshot(deletedKinds, topIndexContent, suffix),
      kindIndexSnapshots,
    ]
  }

const getRelativeFilesSnapshots = (ctx: FullContext): Snapshot[] =>
  pipe(
    seeds2kindScope(ctx.seeds),
    calcByKinds(ctx),
    flat,
    flat,
    map(completePath(ctx.options)),
  )

const toApiFileSnapshot = (update: Seeds, apiDir: string): Snapshot => ({
  group: 'api',
  action: 'delete',
  filePath: `${join(apiDir, update.kind, ...update.namePaths)}.ts`,
})

const toTestApiSnapshot = (
  update: Seeds,
  { options: { apiDir, testDir } }: FullContext,
): Snapshot => ({
  group: 'test',
  action: 'delete',
  filePath: `${join(
    testDir,
    basename(apiDir),
    update.kind,
    ...update.namePaths,
  )}.test.ts`,
})

const mayWithTestFile = (ctx: FullContext) =>
  ctx.options.withTest
    ? (s: Seeds) => [
        toApiFileSnapshot(s, ctx.options.apiDir),
        toTestApiSnapshot(s, ctx),
      ]
    : (s: Seeds) => [toApiFileSnapshot(s, ctx.options.apiDir)]

const calcSnapshots = (ctx: FullContext): Snapshot[] =>
  pipe(
    getRelativeFilesSnapshots(ctx),
    concat(pipe(ctx.seeds, map(mayWithTestFile(ctx)), flat)),
  )

const deleteApis = asyncFlow(
  collectContext,
  calcSnapshots,
  effectFiles,
  logResults,
)

export { calcSnapshots, deleteApis }
