import consola from 'consola'
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
  pickFn,
  pipe,
  waitAll,
} from 'fp-lite'
import { statSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { basename, join, relative } from 'pathe'
import { filename } from 'pathe/utils'
import picomatch from 'picomatch'
import { genIndexProp, genTopIndexProp, genWithWrapper } from '../utils/codeGen'
import { type Snapshot, completePath, effectFiles } from '../utils/effectFiles'
import { logResults } from '../utils/logResults'
import { withoutSuffix } from '../utils/tool'
import { validateKind } from '../utils/validate'
import {
  type DirInfo,
  type TypeFileInfo,
  calcTypeFileSnapshot,
  collectTypeFileInfo,
} from '../utils/withTypeFile'
import type { FullOptions } from './capi'

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
  isExcluded: (path: string) => boolean,
): Promise<string[]> =>
  pipe(
    g.get('dir') ?? [],
    map(flow(takeFirst, walkDir(isExcluded))),
    asyncFlow(waitAll, flat, concat((g.get('file') ?? []).map(takeFirst))),
  )

const ignoredFilename = flow(
  filename,
  name => name !== 'index' && !name.startsWith('.'),
)

/**
 * `exclude` is relative to `apiDir` and matched as a posix path. `dot: true` keeps the
 * opt-in explicit: a project that writes `_shared/**` means it, and dotfiles are already
 * skipped by `ignoredFilename` unless this names them.
 */
const makeExcluded = (apiDir: string, patterns?: readonly string[]) => {
  if (patterns == null || patterns.length === 0) {
    return (_path: string) => false
  }
  const isMatch = picomatch([...patterns], { dot: true })
  return (path: string) => {
    const rel = relative(apiDir, path)
    return rel !== '' && !rel.startsWith('..') && isMatch(rel)
  }
}

const walkDir =
  (isExcluded: (path: string) => boolean) =>
  (dir: string): Promise<string[]> =>
    asyncPipe(
      readdir(dir),
      map(flow(prepend(dir), withIsDir)),
      filter(([path]) => !isExcluded(path)),
      groupBy(([, isDir]) => (isDir ? 'dir' : 'file')),
      g => walkDeep(g, isExcluded),
      filter(ignoredFilename),
    )

const readIndexContent = (dir: string, sourceExt: string) =>
  readFile(join(dir, `index${sourceExt}`)).then(
    v => v.toString(),
    () => '',
  )

const path2arr = flow(
  withoutSuffix,
  x => x.replace(LeaderSlash, ''),
  x => x.split('/'),
)

const makeIndexFileSnapshot = (
  kind: string,
  code: string,
  sourceExt: string,
): Snapshot => ({
  group: 'api',
  action: 'update',
  filePath: join(kind, `index${sourceExt}`),
  code,
})

const gatherIndex = (
  kindDir: string,
  sourceExt: string,
  isExcluded: (path: string) => boolean,
): Promise<GatherPhase> =>
  asyncPipe(
    waitAll([
      readIndexContent(kindDir, sourceExt),
      walkDir(isExcluded)(kindDir),
    ]),
    ([content, files]): GatherPhase => ({
      kind: basename(kindDir),
      content,
      files: files.map(v => v.slice(kindDir.length)),
    }),
  )

const gatherTopIndex =
  (dirs: string[], sourceExt: string) =>
  (content: string): GatherPhase => ({
    kind: '',
    content,
    files: dirs.map(dir => ['', basename(dir), `index${sourceExt}`].join('/')),
  })

const validateAllKind = (vs: string[]): void =>
  vs.forEach(flow(x => basename(x), validateKind))

interface FileTreeInfo {
  kindIndexFiles: GatherPhase[]
  topIndexFile: GatherPhase
  typeFileInfo: TypeFileInfo
  options: Omit<DirInfo, 'testDir'> & {
    exclude?: readonly string[]
    handlerImport?: string
  }
  suffix: string
  sourceExt: string
}

const collectApiInfo = ({
  apiDir,
  sourceExt,
  exclude,
}: Pick<DirInfo, 'apiDir'> & {
  sourceExt: string
  exclude?: readonly string[]
}) => {
  const isExcluded = makeExcluded(apiDir, exclude)
  return asyncPipe(
    readdir(apiDir),
    map(prepend(apiDir)),
    filter(v => statSync(v).isDirectory()),
    filter(v => !isExcluded(v)),
    invoke(validateAllKind),
    dirs =>
      [
        pipe(
          dirs,
          map(dir => gatherIndex(dir, sourceExt, isExcluded)),
          waitAll,
        ),
        asyncPipe(
          readIndexContent(apiDir, sourceExt),
          gatherTopIndex(dirs, sourceExt),
        ),
      ] as const,
    waitAll,
  )
}

const toSnapshot =
  (genCodeFn: (x: string) => string, sourceExt: string) => (v: GatherPhase) =>
    pipe(v.files, map(genCodeFn), genWithWrapper, freshCode =>
      v.content === freshCode
        ? null
        : makeIndexFileSnapshot(v.kind, freshCode, sourceExt),
    )

const topIndexSnapshot = (info: FileTreeInfo) =>
  pipe(
    flow(path2arr, x => x[0], genTopIndexProp(info.suffix)),
    genCodeFn => toSnapshot(genCodeFn, info.sourceExt),
    fn => fn(info.topIndexFile),
  )

const calcSnapshots = (info: FileTreeInfo): Snapshot[] =>
  pipe(
    info.kindIndexFiles,
    map(toSnapshot(flow(path2arr, genIndexProp(info.suffix)), info.sourceExt)),
    concat(topIndexSnapshot(info)),
    filter(notNull),
    map(completePath(info.options)),
    concat(calcTypeFileSnapshot(info)),
  )

export type AlignOption = FileTreeInfo['options'] &
  Pick<FullOptions, 'suffix' | 'sourceExt'> &
  // Absent means "write the files", which is what every caller that is not the CLI
  // means. Only the CLI sets these, from flags that default to false.
  Partial<Pick<FullOptions, 'check' | 'json'>>

const collectContext = (options: AlignOption): Promise<FileTreeInfo> =>
  asyncPipe(
    waitAll([collectApiInfo(options), collectTypeFileInfo(options)]),
    ([[kindIndexFiles, topIndexFile], typeFileInfo]) => ({
      kindIndexFiles,
      topIndexFile,
      typeFileInfo,
      options,
      suffix: options.suffix,
      sourceExt: options.sourceExt,
    }),
  )

const pickOption4align = (full: FullOptions): AlignOption => {
  const x = pickFn(
    full,
    'apiDir',
    'typesDir',
    'handlerImport',
    'exclude',
    'suffix',
    'sourceExt',
    'check',
    'json',
  )
  return x
}

/**
 * `--check` is the same snapshot calculation as a normal run, stopped before `effectFiles`.
 * A caller — CI or an agent — gets a non-zero exit code and the list of files that would
 * change, without the disk being touched.
 */
const syncApiByFile = async (options: AlignOption) => {
  const snapshots = calcSnapshots(await collectContext(options))
  if (!options.check) {
    const applied = effectFiles(snapshots)
    if (options.json) {
      console.log(
        JSON.stringify({
          ok: true,
          changed: applied.map(v => ({ action: v.action, file: v.filePath })),
        }),
      )
      return applied
    }
    return logResults(applied)
  }

  if (snapshots.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ ok: true, changed: [] }))
    } else {
      consola.success('Generated files are up to date')
    }
    return snapshots
  }

  if (options.json) {
    console.log(
      JSON.stringify({
        ok: false,
        changed: snapshots.map(v => ({ action: v.action, file: v.filePath })),
      }),
    )
  } else {
    logResults(snapshots)
    consola.error(`Found ${snapshots.length} generated file(s) out of date.`)
  }
  process.exitCode = 1
  return snapshots
}

export { calcSnapshots, pickOption4align, syncApiByFile }
