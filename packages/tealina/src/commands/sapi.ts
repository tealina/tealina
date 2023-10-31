import {
  asyncFlow,
  asyncPipe,
  concat,
  filter,
  flat,
  flow,
  groupBy,
  invoke,
  map,
  notNull,
  pipe,
  waitAll,
} from 'fp-lite'
import { statSync } from 'fs'
import { readFile, readdir } from 'node:fs/promises'
import { basename, dirname, join } from 'pathe'
import { genIndexProp, genTopIndexProp, genWithWrapper } from '../utils/codeGen'
import { Snapshot, completePath, effectFiles } from '../utils/effectFiles'
import { logResults } from '../utils/logResults'
import { MinimalInput, loadConfig, withoutSuffix } from '../utils/tool'
import { validateKind } from '../utils/validate'
import {
  DirInfo,
  TypeFileInfo,
  calcTypeFileSnapshot,
  collectTypeFileInfo,
} from '../utils/withTypeFile'

interface GatherPhase {
  kind: string
  content: string
  files: string[]
}

const LeaderSlash = /^\//

const prepend = (dir: string) => (file: string) => join(dir, file)

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

const readIndexContent = (dir: string) =>
  readFile(join(dir, 'index.ts')).then(
    v => v.toString(),
    () => '',
  )

const makeExportCode = (suffix: string) =>
  flow(
    withoutSuffix,
    x => x.replace(LeaderSlash, ''),
    x => x.split('/'),
    genIndexProp(suffix),
  )

const makeIndexFileSnapshot = (kind: string, code: string): Snapshot => ({
  group: 'api',
  action: 'update',
  filePath: join(kind, 'index.ts'),
  code,
})

const gatherIndex = (kindDir: string): Promise<GatherPhase> =>
  asyncPipe(
    waitAll([readIndexContent(kindDir), walkDir(kindDir)]),
    ([content, files]): GatherPhase => ({
      kind: basename(kindDir),
      content,
      files: files.map(v => v.slice(kindDir.length)),
    }),
  )

const gatherTopIndex =
  (dirs: string[]) =>
  (content: string): GatherPhase => ({
    kind: '',
    content,
    files: dirs.map(dir => ['', basename(dir), 'index.ts'].join('/')),
  })

const validateAllKind = (vs: string[]): void =>
  vs.forEach(flow(x => basename(x), validateKind))

interface FileTreeInfo {
  kindIndexFiles: GatherPhase[]
  topIndexFile: GatherPhase
  typeFileInfo: TypeFileInfo
  commonOption: MinimalInput
  suffix: string
}

const collectApiInfo = ({ apiDir }: DirInfo) =>
  asyncPipe(
    readdir(apiDir),
    map(prepend(apiDir)),
    filter(v => statSync(v).isDirectory()),
    invoke(validateAllKind),
    dirs =>
      [
        pipe(dirs, map(gatherIndex), waitAll),
        asyncPipe(readIndexContent(apiDir), gatherTopIndex(dirs)),
      ] as const,
    waitAll,
  )

const toSnapshot = (genCodeFn: (x: string) => string) => (v: GatherPhase) =>
  pipe(v.files, map(genCodeFn), genWithWrapper, freshCode =>
    v.content == freshCode ? null : makeIndexFileSnapshot(v.kind, freshCode),
  )

const topIndexSnapshot = (info: FileTreeInfo) =>
  toSnapshot(f => genTopIndexProp(info.suffix)(dirname(f)))(info.topIndexFile)

const calcSnapshots = (info: FileTreeInfo): Snapshot[] =>
  pipe(
    info.kindIndexFiles,
    map(toSnapshot(makeExportCode(info.suffix))),
    concat(topIndexSnapshot(info)),
    filter(notNull),
    map(completePath(info.commonOption)),
    concat(calcTypeFileSnapshot(info)),
  )

const collectContext = (commonOption: MinimalInput) =>
  asyncPipe(
    waitAll([collectApiInfo(commonOption), collectTypeFileInfo(commonOption)]),
    ([[kindIndexFiles, topIndexFile], typeFileInfo]) => ({
      kindIndexFiles,
      topIndexFile,
      typeFileInfo,
      commonOption,
      suffix: commonOption.suffix,
    }),
  )

const syncApiByFile = asyncFlow(
  loadConfig,
  collectContext,
  calcSnapshots,
  effectFiles,
  waitAll,
  logResults,
)

export { calcSnapshots, syncApiByFile }
