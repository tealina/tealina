import {
  asyncFlow,
  asyncPipe,
  concat,
  filter,
  flat,
  flow,
  groupBy,
  isEmpty,
  map,
  notNull,
  peek,
  pipe,
  waitAll,
} from 'fp-lite'
import { statSync } from 'fs'
import { readdir } from 'fs/promises'
import path from 'path'
import {
  genIndexProp,
  genTopIndexProp,
  genWithWrapper,
} from '../utils/codeGen.js'
import { Snapshot, completePath, effectFiles } from '../utils/effectFiles.js'
import { logResults } from '../utils/logResults.js'
import { TealinaComonOption } from '../utils/options.js'
import { readIndexFile, withoutSuffix } from '../utils/tool.js'
import { validateKind } from '../utils/validate.js'
import {
  TypeFileInfo,
  calcTypeFileSnapshot,
  collectTypeFileInfo,
} from '../utils/withTypeFile.js'
import { MergedOption } from './capi.js'
interface GatherPhase {
  kind: string
  content: string[]
  imps: string[]
  files: string[]
}

type DiffPhase = {
  pre: GatherPhase
  shouldRemove: string[]
  shouldAppend: string[]
}

const LeftBrecket = /^\(/
const SingleQuete = /^'|'$/g
const LeaderSlash = /^\//

const prepend = (dir: string) => (file: string) => path.join(dir, file)

const withIsDir = (path: string): [string, boolean] => [
  path,
  statSync(path).isDirectory(),
]

type FirstElement<T> = T extends [infer U, ...any[]] ? U : undefined

const takeFirst = <T extends any[]>(xs: T): FirstElement<T> => xs[0]

const walkDeep = (
  g: Map<'dir' | 'file', [string, boolean][]>,
): Promise<string[]> =>
  pipe(
    g.get('dir') ?? [],
    map(flow(takeFirst, walkDir)),
    asyncFlow(waitAll, flat, concat((g.get('file') ?? []).map(takeFirst))),
  )

const walkDir = (dir: string): Promise<string[]> =>
  asyncPipe(
    readdir(dir),
    map(flow(prepend(dir), withIsDir)),
    groupBy(([, isDir]) => (isDir ? 'dir' : 'file')),
    walkDeep,
    filter(v => !v.endsWith('/index.ts')),
  )

const ensureStatsWithSlash = (x: string): string =>
  x.replace(LeftBrecket, '').replace(SingleQuete, '').slice(1)

const renameSuffix = (name: string) => name.replace('.js', '.ts')

const toImps = flow(
  map((line: string) => line.split('import(').pop()?.slice(0, -2)),
  filter(notNull),
  map(flow(ensureStatsWithSlash, renameSuffix)),
)

const getIndexContent = (dir: string) =>
  readIndexFile([dir, 'index.ts'].join('/'))

const toKeyMapTrue = flow(
  map((x: string) => [x, true] as const),
  kvs => new Map(kvs),
)

const calcDiff = ({ imps, files }: GatherPhase) =>
  pipe(
    [toKeyMapTrue(imps), toKeyMapTrue(files)],
    ([existImpMap, existFileMap]) => ({
      shouldRemove: imps.filter(imp => !existFileMap.has(imp)),
      shouldAppend: files.filter(file => !existImpMap.has(file)),
    }),
  )

const toDiffPhase = (phase: GatherPhase): DiffPhase => ({
  pre: phase,
  ...calcDiff(phase),
})

const hasUpdate = ({ shouldRemove, shouldAppend, pre }: DiffPhase) =>
  shouldAppend.length > 0 || shouldRemove.length > 0

const toExportcode = flow(
  withoutSuffix,
  x => x.replace(LeaderSlash, ''),
  x => x.split('/'),
  genIndexProp,
)

const getNewContent = (
  { pre, shouldAppend, shouldRemove }: DiffPhase,
  genFn: (filePath: string) => string,
): string | null => {
  const contents = pre.content
  const append = shouldAppend.map(genFn)
  const remove = shouldRemove.map(genFn)
  const remain = contents.filter(code => !remove.includes(code))
  const newLines = append.filter(code => !contents.includes(code))
  if (isEmpty(remove) && isEmpty(newLines)) return null
  return genWithWrapper([...newLines, ...remain])
}

const calcIndexFileSnapshot = (diff: DiffPhase): Snapshot => ({
  group: 'api',
  action: 'updated',
  filePath: path.join(diff.pre.kind, 'index.ts'),
  code: getNewContent(diff, toExportcode),
})

const calcTopIndexFileSnapshot = (diff: DiffPhase): Snapshot => ({
  group: 'api',
  action: 'updated',
  filePath: 'index.ts',
  code: getNewContent(
    diff,
    flow(
      filePath => path.dirname(filePath).slice(1), //eg: /func/index.ts => func
      genTopIndexProp,
    ),
  ),
})

const gatherIndex = (kindDir: string): Promise<GatherPhase> =>
  asyncPipe(
    waitAll([getIndexContent(kindDir), walkDir(kindDir)]),
    ([content, files]): GatherPhase => ({
      kind: path.basename(kindDir),
      content,
      imps: toImps(content),
      files: files.map(v => v.slice(kindDir.length)),
    }),
  )

const gatherTopIndex =
  (dirs: string[]) =>
  (content: string[]): GatherPhase => ({
    kind: '',
    content,
    imps: toImps(content),
    files: dirs.map(dir => ['', path.basename(dir), 'index.ts'].join('/')),
  })

const validAllKind = (vs: string[]): void =>
  vs.forEach(flow(x => path.basename(x), validateKind))

interface FileTreeInfo {
  kindIndexFiles: GatherPhase[]
  topIndexFile: GatherPhase
  typeFileInfo: TypeFileInfo
  commonOption: MergedOption
}

const collectApiInfo = ({ apiDir }: TealinaComonOption) =>
  asyncPipe(
    readdir(apiDir),
    map(prepend(apiDir)),
    filter(v => statSync(v).isDirectory()),
    peek(validAllKind),
    dirs =>
      [
        pipe(dirs, map(gatherIndex), waitAll),
        asyncPipe(getIndexContent(apiDir), gatherTopIndex(dirs)),
      ] as const,
    waitAll,
  )

const calcKindIndexSnapshot = flow(
  map(toDiffPhase),
  filter(hasUpdate),
  map(calcIndexFileSnapshot),
)

const calcTopIndexSnapshot = flow(toDiffPhase, v =>
  hasUpdate(v) ? [calcTopIndexFileSnapshot(v)] : [],
)

const calcSnapshots = (info: FileTreeInfo): Snapshot[] =>
  pipe(
    calcKindIndexSnapshot(info.kindIndexFiles),
    concat(calcTopIndexSnapshot(info.topIndexFile)),
    map(completePath(info.commonOption)),
    concat(calcTypeFileSnapshot(info)),
  )

const prepareInfo = (commonOption: MergedOption) =>
  asyncPipe(
    waitAll([collectApiInfo(commonOption), collectTypeFileInfo(commonOption)]),
    ([[kindIndexFiles, topIndexFile], typeFileInfo]) => ({
      kindIndexFiles,
      topIndexFile,
      typeFileInfo,
      commonOption,
    }),
  )

const syncApiByFile = asyncFlow(
  prepareInfo,
  calcSnapshots,
  effectFiles,
  waitAll,
  logResults,
)

export { syncApiByFile }
