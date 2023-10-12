import {
  asyncFlow,
  concat,
  deepFlat,
  filter,
  flat,
  flow,
  isEmpty,
  map,
  notNull,
  pipe,
} from 'fp-lite'
import path from 'node:path'
import { genIndexProp, genTopIndexProp, genWithWrapper } from '../utils/codeGen'
import { Snapshot, completePath, effectFiles } from '../utils/effectFiles'
import { logResults } from '../utils/logResults'
import { calcTypeFileSnapshot } from '../utils/withTypeFile'
import {
  FullContext,
  Seeds,
  collectContext,
  seeds2kindScope,
  validateInput,
} from './capi'

const toKeyMapTrue = flow(
  map((x: string) => [x, true] as const),
  kvs => new Map(kvs),
)

const getTopIndexSnapshot = (
  xs: { kind: string }[],
  topIndexContent: string[],
): Snapshot =>
  pipe(xs, map(flow(v => v.kind, genTopIndexProp)), (imps): Snapshot => {
    const existImpMap = toKeyMapTrue(imps)
    const remains = topIndexContent.filter(v => !existImpMap.has(v))
    return {
      group: 'api',
      action: 'updated',
      filePath: 'index.ts',
      code: genWithWrapper(remains),
    }
  })

interface KindSummary {
  kind: string
  namePathsArray: string[][]
}

const toIndexSnapshot =
  (kindIndexMap: Map<string, string[]>) =>
  (v: KindSummary): (Snapshot & { kind: string }) | null => {
    const imps = v.namePathsArray.map(pathArr => genIndexProp(pathArr))
    const { kind } = v
    const contents = kindIndexMap.get(kind) ?? []
    const remains = contents.filter(v => !imps.includes(v))
    const filePath = path.join(kind, 'index.ts')
    return isEmpty(remains)
      ? { group: 'api', action: 'deleted', filePath, kind }
      : {
          group: 'api',
          action: 'updated',
          filePath,
          code: genWithWrapper(remains),
          kind,
        }
  }

const calcByKinds =
  ({ kindIndexContentMap, topIndexContent }: FullContext) =>
  (kinds: KindSummary[]) => {
    const kindIndexSnapshots = pipe(
      kinds,
      map(toIndexSnapshot(kindIndexContentMap)),
      filter(notNull),
    )
    const deletedKinds = kindIndexSnapshots.filter(v => v.action == 'deleted')
    if (deletedKinds.length < 1) return kindIndexSnapshots
    return [
      getTopIndexSnapshot(deletedKinds, topIndexContent),
      kindIndexSnapshots,
    ]
  }

const getRelativeFilesSnapshots = (ctx: FullContext): Snapshot[] =>
  pipe(
    seeds2kindScope(ctx.seeds),
    calcByKinds(ctx),
    deepFlat(2),
    map(completePath(ctx.commonOption)),
    concat(calcTypeFileSnapshot(ctx)),
  )

const toApiFileSnapshot = (update: Seeds, apiDir: string): Snapshot => ({
  group: 'api',
  action: 'deleted',
  filePath: `${path.join(apiDir, update.kind, ...update.namePaths)}.ts`,
})

const toTestApiSnapshot = (
  update: Seeds,
  { commonOption: { apiDir, testDir } }: FullContext,
): Snapshot => ({
  group: 'test',
  action: 'deleted',
  filePath: `${path.join(
    testDir,
    path.basename(apiDir),
    update.kind,
    ...update.namePaths,
  )}.test.ts`,
})

const mayWithTestFile = (ctx: FullContext) =>
  ctx.commonOption.withTest
    ? (s: Seeds) => [
        toApiFileSnapshot(s, ctx.commonOption.apiDir),
        toTestApiSnapshot(s, ctx),
      ]
    : (s: Seeds) => [toApiFileSnapshot(s, ctx.commonOption.apiDir)]

const calcSnapshots = (ctx: FullContext): Snapshot[] =>
  pipe(
    getRelativeFilesSnapshots(ctx),
    concat(pipe(ctx.seeds, map(mayWithTestFile(ctx)), flat)),
  )

const deleteApis = asyncFlow(
  validateInput,
  collectContext,
  calcSnapshots,
  effectFiles,
  logResults,
)

export { calcSnapshots, deleteApis }
