import {
  asyncFlow,
  asyncPipe,
  concat,
  filter,
  flat,
  flow,
  isEmpty,
  map,
  notNull,
  pipe,
  separeBy,
  unique,
  waitAll,
} from 'fp-lite'
import { basename, join } from 'pathe'
import type { RawOptions } from '.'
import type {
  ApiTemplateType,
  GenTestSuiteFnType,
  TealinaConifg,
  TemplateConfig,
} from '../index'
import { genIndexProp, genTopIndexProp, genWithWrapper } from '../utils/codeGen'
import { type Snapshot, completePath, effectFiles } from '../utils/effectFiles'
import { logResults } from '../utils/logResults'
import { extraModelNames } from '../utils/parsePrisma'
import {
  parseCreateInfo as parseCreationInfo,
  readIndexFile,
  unCapitalize,
} from '../utils/tool'
import { isValidHttpMethod } from '../utils/validate'
import {
  type DirInfo,
  type TypeFileInfo,
  calcTypeFileSnapshot,
  collectTypeFileInfo,
} from '../utils/withTypeFile'
import { pathExists } from '../utils/fs-extra'

interface Seeds {
  kind: string
  namePaths: string[]
  generateFn: ApiTemplateType['generateFn']
}

interface FileSummary {
  filePath: string
  isExists: boolean
}

interface FullSeeds extends Seeds {
  apiFileSummary: FileSummary
  testFileSummary: FileSummary
}

type FullOptions = Omit<RawOptions, 'route' | 'suffix'> & {
  route: string
  suffix: string
} & TealinaConifg

interface FullContext {
  seeds: FullSeeds[]
  kindIndexContentMap: Map<string, string[]>
  topIndexContent: string[]
  typeFileInfo: TypeFileInfo
  options: FullOptions
  testHelperInfo: { isExists: boolean; filePath: string }
  testTemplate: TemplateConfig['test']
  suffix: string
}

const parseByAlias = (
  preNames: string[],
  templates: ApiTemplateType[],
  aliasFromInput: string,
): Seeds[] => {
  const apperenceAlias = aliasFromInput.split('')
  const toSeeds = (preName: string): Seeds[] =>
    pipe(
      templates,
      filter(v => apperenceAlias.includes(v.alias)),
      map(({ generateFn, name = '', method }) => ({
        generateFn,
        namePaths: name.length ? [preName, name] : [preName],
        kind: method ?? 'post',
      })),
    )
  return pipe(preNames, map(toSeeds), flat)
}

const loadTemplateConfig = async (
  rawOptions: FullOptions,
): Promise<FullOptions> => {
  const { route } = rawOptions
  const arr = mayTransformParams(route.split('/'))
  const routeParts = isValidHttpMethod(arr[0]) ? arr : ['post', ...arr]
  return {
    ...rawOptions, //test mode can override the config
    route: routeParts.join('/'),
  }
}

const makeStrategies = (
  method: string,
  name: string,
): ((template: ApiTemplateType) => boolean)[] => [
  t => t.method === method && t.name === name,
  t => t.method === method && t.alias === '*',
  t => t.alias === '*',
]

const parseByRoute = (route: string, tempConfig: ApiTemplateType[]): Seeds => {
  const [kind, ...namePaths] = route.split('/')
  // tail may empty in restful style
  const name = namePaths[namePaths.length - 1]
  const strategies = makeStrategies(kind, name)
  const template = tempConfig.find(t => strategies.some(f => f(t))) ?? {
    name: '',
    generateFn: ctx => '',
  }
  const { generateFn } = template
  return { generateFn, namePaths, kind }
}

const prepareKindArgsByModel = async (
  opt: RawOptions,
  tempConfig: ApiTemplateType[],
): Promise<Seeds[]> => {
  const { templateAlias } = opt
  if (templateAlias == null) {
    throw new Error('Missing template alias')
  }
  const nameGroup = await extraModelNames(opt.input)
  const rawNames = nameGroup.get('model') ?? []
  return parseByAlias(rawNames.map(unCapitalize), tempConfig, templateAlias)
}

const getTouchedKinds = (opt: FullOptions) => {
  const resftulOpt = opt
  const { templateAlias, route } = resftulOpt
  if (templateAlias == null) return route.split('/').slice(0, 1)
  const aliasMap = new Map(templateAlias.split('').map(v => [v, true]))

  return pipe(
    opt.template?.handlers ?? [],
    filter(t => aliasMap.has(t.alias)),
    map(v => v.method ?? 'post'),
    unique,
  )
}

const gatherIndexContent = (apiDir: string) => (kinds: string[]) =>
  asyncPipe(
    Promise.resolve(kinds),
    map(kind =>
      readIndexFile(join(apiDir, kind, 'index.ts')).then(
        content => [kind, content] as const,
      ),
    ),
    waitAll,
    kvs => new Map(kvs),
  )

const toKeyMapTrue = flow(
  map((x: string) => [x, true] as const),
  kvs => new Map(kvs),
)

const getTopIndexSnapshot = (
  xs: { kind: string }[],
  topIndexContent: string[],
  suffix: string,
): Snapshot | null =>
  pipe(
    xs,
    map(flow(v => v.kind, genTopIndexProp(suffix))),
    (imps): Snapshot | null => {
      const existImpMap = toKeyMapTrue(topIndexContent)
      const newImps = imps.filter(v => !existImpMap.has(v))
      if (newImps.length < 1) return null
      return {
        group: 'api',
        action: topIndexContent.length ? 'update' : 'create',
        filePath: 'index.ts',
        code: genWithWrapper([...newImps, ...topIndexContent]),
      }
    },
  )

const toIndexSnapshot =
  (kindIndexMap: Map<string, string[]>, suffix: string) =>
  (v: { kind: string; namePathsArray: string[][] }): Snapshot | null => {
    const imps = v.namePathsArray.map(pathArr => genIndexProp(suffix)(pathArr))
    const { kind } = v
    const contents = kindIndexMap.get(kind) ?? []
    const existImpMap = toKeyMapTrue(contents)
    const newImps = imps.filter(v => !existImpMap.has(v))
    if (newImps.length < 1) return null
    return {
      group: 'api',
      action: isEmpty(contents) ? 'create' : 'update',
      filePath: join(kind, 'index.ts'),
      code: genWithWrapper([...newImps, ...contents]),
    }
  }

const calcRelativeFilesSnapshots = ({
  seeds,
  kindIndexContentMap,
  topIndexContent,
  options: dirInfo,
  suffix,
}: FullContext): Snapshot[] =>
  pipe(seeds2kindScope(seeds), kinds =>
    pipe(
      [getTopIndexSnapshot(kinds, topIndexContent, suffix)],
      concat(kinds.map(toIndexSnapshot(kindIndexContentMap, suffix))),
      filter(notNull),
      map(completePath(dirInfo)),
    ),
  )

const toApiFileSnapshot = ({
  kind,
  namePaths,
  generateFn,
  apiFileSummary: { filePath },
}: FullSeeds): Snapshot => ({
  group: 'api',
  action: 'create',
  filePath,
  code: generateFn(parseCreationInfo(kind, namePaths)),
})

const toApiTestSnapshot =
  (genSuite: GenTestSuiteFnType) =>
  ({ kind, namePaths, testFileSummary }: FullSeeds): Snapshot => ({
    group: 'test',
    action: 'create',
    filePath: testFileSummary.filePath,
    code: genSuite({
      method: kind,
      route: namePaths.join('/'),
      relative2ancestor: Array(namePaths.length).fill('..').join('/'),
    }),
  })

const toTestHelperSnapshot = ({
  testHelperInfo: { filePath },
  testTemplate,
  options: { apiDir, typesDir },
  seeds: [{ namePaths }],
}: FullContext): Snapshot => ({
  group: 'test',
  action: 'create',
  filePath,
  code: testTemplate?.genHelper?.({
    relative2ancestor: Array(namePaths.length).fill('..').join('/'),
    typesDirName: basename(typesDir),
    apiDirName: basename(apiDir),
  }),
})

const calcTestSnapshots = (ctx: FullContext) => {
  if (ctx.testTemplate == null) return []
  return pipe(
    ctx.seeds,
    filter(v => !v.testFileSummary.isExists),
    map(toApiTestSnapshot(ctx.testTemplate.genSuite)),
    ctx.testTemplate.genHelper == null || ctx.testHelperInfo.isExists
      ? x => x
      : concat(toTestHelperSnapshot(ctx)),
  )
}

const calcApiSnpashots = (ctx: FullContext) =>
  pipe(
    ctx.seeds,
    filter(v => !v.apiFileSummary.isExists),
    map(toApiFileSnapshot),
  )

const calcSnapshots = (ctx: FullContext): Snapshot[] =>
  pipe(
    calcRelativeFilesSnapshots(ctx),
    concat(calcApiSnpashots(ctx)),
    ctx.options.withTest ? concat(calcTestSnapshots(ctx)) : x => x,
    concat(calcTypeFileSnapshot(ctx)),
  )

const ColonPattern = /^:/
const mayTransformParams = (arr: string[]) => {
  return arr.map(v => (ColonPattern.test(v) ? `[${v.slice(1)}]` : v))
}

const prepareKindArgs = async (
  opt: FullOptions,
  tempConfig: ApiTemplateType[],
): Promise<Seeds[]> => {
  const { templateAlias, route } = opt
  const targeTemplates = templateAlias
    ? parseByAlias(route.split('/').slice(1), tempConfig, templateAlias)
    : [parseByRoute(route, tempConfig)]
  return Promise.resolve(targeTemplates)
}

const seeds2kindScope = flow(
  separeBy((v: Seeds) => v.kind), //may had same kind templates
  map(xxs => ({
    kind: xxs[0].kind,
    namePathsArray: xxs.map(v => v.namePaths),
  })), //only care about kind and pathArrList
)

const getTestHeplerPath = (opt: DirInfo) =>
  join(opt.testDir, basename(opt.apiDir), 'helper.ts')

const getTestFilePath = (
  { apiDir, testDir }: DirInfo,
  { kind, namePaths }: Seeds,
) => `${join(testDir, basename(apiDir), kind, ...namePaths)}.test.ts`

const getApiFilePath = (
  { apiDir }: Pick<DirInfo, 'apiDir'>,
  { kind, namePaths }: Seeds,
) => `${join(apiDir, kind, ...namePaths)}.ts`

const getFileSummary = (filePath: string): Promise<FileSummary> =>
  pathExists(filePath).then(isExists => ({ filePath, isExists }))

const getTestFileSummary = async (
  opt: FullOptions,
  seeds: Seeds,
): Promise<FileSummary> => {
  if (opt.withTest && opt.testDir != null) {
    return getFileSummary(getTestFilePath(opt as DirInfo, seeds))
  }
  return { filePath: '', isExists: true }
}

const withFileState =
  (opt: FullOptions) =>
  async (seeds: Seeds): Promise<FullSeeds> =>
    asyncPipe(
      waitAll([
        getFileSummary(getApiFilePath(opt, seeds)),
        getTestFileSummary(opt, seeds),
      ]),
      ([apiFileSummary, testFileSummary]) => ({
        ...seeds,
        apiFileSummary,
        testFileSummary,
      }),
    )

const getSeeds = (
  opt: FullOptions,
  tempConfig: ApiTemplateType[] = [],
): Promise<FullSeeds[]> =>
  asyncPipe(
    opt.model
      ? prepareKindArgsByModel(opt, tempConfig)
      : prepareKindArgs(opt, tempConfig),
    map(withFileState(opt)),
    waitAll,
  )

const checkTestHelper = async (
  opt: FullOptions,
): Promise<FullContext['testHelperInfo']> => {
  if (opt.testDir == null) return { isExists: true, filePath: '' }
  const filePath = getTestHeplerPath(opt as DirInfo)
  const isExists = opt.withTest ? await pathExists(filePath) : false
  return { isExists, filePath }
}

const toKeyValue =
  <K extends keyof FullContext>(k: K) =>
  (v: FullContext[K]) => [k, v]

const collectContext = asyncFlow(
  loadTemplateConfig,
  config =>
    [
      getSeeds(config, config.template?.handlers).then(toKeyValue('seeds')),
      pipe(getTouchedKinds(config), gatherIndexContent(config.apiDir)).then(
        toKeyValue('kindIndexContentMap'),
      ),
      readIndexFile(join(config.apiDir, 'index.ts')).then(
        toKeyValue('topIndexContent'),
      ),
      collectTypeFileInfo(config).then(toKeyValue('typeFileInfo')),
      checkTestHelper(config).then(toKeyValue('testHelperInfo')),
      toKeyValue('testTemplate')(config.template?.test),
      toKeyValue('options')(config),
      ['suffix', config.suffix],
    ] as const,
  waitAll,
  kvs => Object.fromEntries(kvs) as FullContext,
)

const createApis = asyncFlow(
  collectContext,
  calcSnapshots,
  effectFiles,
  logResults,
)

export {
  calcRelativeFilesSnapshots,
  calcSnapshots,
  collectContext,
  createApis,
  getApiFilePath,
  getSeeds,
  getTestFilePath,
  getTestHeplerPath,
  parseByAlias,
  parseByRoute,
  prepareKindArgs,
  seeds2kindScope,
}

export type { FullContext, FullOptions, Seeds }
