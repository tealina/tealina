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
import { pathExists } from 'fs-extra'
import path from 'node:path'
import type { ApiTemplateType, TealinaConifg } from '../index.js'
import {
  genIndexProp,
  genTopIndexProp,
  genWithWrapper,
} from '../utils/codeGen.js'
import { Snapshot, completePath, effectFiles } from '../utils/effectFiles.js'
import { logResults } from '../utils/logResults.js'
import { TealinaComonOption } from '../utils/options.js'
import { parseSchema, toFindable } from '../utils/parsePrisma.js'
import { parseCreateInfo, readIndexFile, unCapitalize } from '../utils/tool.js'
import { isValidHttpMethod } from '../utils/validate.js'
import {
  DirInfo,
  TypeFileInfo,
  calcTypeFileSnapshot,
  collectTypeFileInfo,
} from '../utils/withTypeFile.js'
import { loadConfig } from '../utils/tool.js'

export interface BaseOption extends TealinaComonOption {
  /** restful style */
  templateAlias?: string
  withTest: boolean
}

interface ByModelOption extends BaseOption {
  /** create APIs by model name in schema file */
  byModel: boolean
  templateAlias: string
  /** the schema file path */
  schema: string
}

interface RegularOption extends BaseOption {
  route: string
}
interface Seeds {
  kind: string
  namePaths: string[]
  generateFn: ApiTemplateType['generateFn']
}

type OptionTypes = RegularOption | ByModelOption

interface FileSummary {
  filePath: string
  isExists: boolean
}

interface FullSeeds extends Seeds {
  apiFileSummary: FileSummary
  testFileSummary: FileSummary
}

export type MergedOption = OptionTypes & DirInfo

interface FullContext {
  seeds: FullSeeds[]
  kindIndexContentMap: Map<string, string[]>
  topIndexContent: string[]
  typeFileInfo: TypeFileInfo
  commonOption: MergedOption
  testHelperInfo: { isExists: boolean; filePath: string }
  testTemplate: TealinaConifg['template']['test']
}

const isByModel = (option: BaseOption): option is ByModelOption =>
  'byModel' in option

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
      map(({ generateFn, name, method }) => ({
        generateFn,
        namePaths: name.length ? [preName, name] : [preName],
        kind: method ?? 'post',
      })),
    )
  return pipe(preNames, map(toSeeds), flat)
}

const loadTemplateConfig = async (
  rawOptions: OptionTypes,
): Promise<{ config: TealinaConifg; option: MergedOption }> => {
  const config = await loadConfig(path.resolve(rawOptions.configPath))
  return {
    config,
    option: {
      testDir: config.testDir,
      typesDir: config.typesDir,
      ...rawOptions, //test mode can override the config
    },
  }
}

const validateInput = (...dynamicArgs: any[]): Promise<OptionTypes> => {
  const option = dynamicArgs.pop()
  const args = dynamicArgs
  try {
    const opt = isByModel(option)
      ? validateByModelOption(option)
      : validateRegularOption(args, option)
    return Promise.resolve(opt)
  } catch (error) {
    return Promise.reject(error)
  }
}

const getModelNamesInSchema = async (option: ByModelOption) => {
  const schema = await parseSchema(option.schema)
  const { findBlocks, takeBlockName } = toFindable(schema)
  return findBlocks('model').map(flow(takeBlockName, unCapitalize))
}

const makeStrategies = (
  method: string,
  name: string,
): ((template: ApiTemplateType) => boolean)[] => [
  t => t.method == method && t.name == name,
  t => t.method == method && t.alias == '*',
  t => t.alias == '*',
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
  opt: ByModelOption,
  tempConfig: ApiTemplateType[],
): Promise<Seeds[]> => {
  const { templateAlias } = opt
  const modelNames = await getModelNamesInSchema(opt)
  return parseByAlias(modelNames, tempConfig, templateAlias)
}

const getTouchedKinds = (opt: BaseOption, tempConfig: ApiTemplateType[]) => {
  const resftulOpt = opt as RegularOption
  const { templateAlias, route } = resftulOpt
  if (templateAlias == null) return route.split('/').slice(0, 1)
  const aliasMap = new Map(templateAlias.split('').map(v => [v, true]))
  return pipe(
    tempConfig,
    filter(t => aliasMap.has(t.alias)),
    map(v => v.method ?? 'post'),
    unique,
  )
}

const gatherIndexContent = (apiDir: string) => (kinds: string[]) =>
  asyncPipe(
    Promise.resolve(kinds),
    map(kind =>
      readIndexFile(path.join(apiDir, kind, 'index.ts')).then(
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
): Snapshot | null =>
  pipe(xs, map(flow(v => v.kind, genTopIndexProp)), (imps): Snapshot | null => {
    const existImpMap = toKeyMapTrue(topIndexContent)
    const newImps = imps.filter(v => !existImpMap.has(v))
    if (newImps.length < 1) return null
    return {
      group: 'api',
      action: topIndexContent.length ? 'updated' : 'created',
      filePath: 'index.ts',
      code: genWithWrapper([...newImps, ...topIndexContent]),
    }
  })

const toIndexSnapshot =
  (kindIndexMap: Map<string, string[]>) =>
  (v: { kind: string; namePathsArray: string[][] }): Snapshot | null => {
    const imps = v.namePathsArray.map(pathArr => genIndexProp(pathArr))
    const { kind } = v
    const contents = kindIndexMap.get(kind) ?? []
    const existImpMap = toKeyMapTrue(contents)
    const newImps = imps.filter(v => !existImpMap.has(v))
    if (newImps.length < 1) return null
    return {
      group: 'api',
      action: isEmpty(contents) ? 'created' : 'updated',
      filePath: path.join(kind, 'index.ts'),
      code: genWithWrapper([...newImps, ...contents]),
    }
  }

const calcRelativeFilesSnapshots = ({
  seeds,
  kindIndexContentMap,
  topIndexContent,
  commonOption: dirInfo,
}: FullContext): Snapshot[] =>
  pipe(seeds2kindScope(seeds), kinds =>
    pipe(
      [getTopIndexSnapshot(kinds, topIndexContent)],
      concat(kinds.map(toIndexSnapshot(kindIndexContentMap))),
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
  action: 'created',
  filePath,
  code: generateFn(parseCreateInfo(kind, namePaths)),
})

const toApiTestSnapshot =
  ({ testTemplate: { genSuite } }: FullContext) =>
  ({ kind, namePaths, testFileSummary }: FullSeeds): Snapshot => ({
    group: 'test',
    action: 'created',
    filePath: testFileSummary.filePath,
    code: genSuite({
      method: kind,
      route: namePaths.join('/'),
      relative2ancestor: Array(namePaths.length).fill('..').join('/'),
    }),
  })

const toTestHelperSnapshot = ({
  testHelperInfo: { filePath },
  testTemplate: { genHelper },
  commonOption: { apiDir, typesDir },
  seeds: [{ namePaths }],
}: FullContext): Snapshot => ({
  group: 'test',
  action: 'created',
  filePath,
  code: genHelper!({
    relative2ancestor: Array(namePaths.length).fill('..').join('/'),
    typesDirName: path.basename(typesDir),
    apiDirName: path.basename(apiDir),
  }),
})

const calcTestSnapshots = (ctx: FullContext) =>
  pipe(
    ctx.seeds,
    filter(v => !v.testFileSummary.isExists),
    map(toApiTestSnapshot(ctx)),
    ctx.testTemplate.genHelper == null || ctx.testHelperInfo.isExists
      ? x => x
      : concat(toTestHelperSnapshot(ctx)),
  )

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
    ctx.commonOption.withTest ? concat(calcTestSnapshots(ctx)) : x => x,
    concat(calcTypeFileSnapshot(ctx)),
  )

const validateRegularOption = (
  args: (string | undefined)[],
  rawOption: BaseOption,
  command = 'capi',
): RegularOption => {
  const [rawRoute, templateAlias] = args //['user','crud']
  if (rawRoute == null) {
    throw new Error(`Route is required, eg: ${command} user/create`)
  }
  const alisa = templateAlias ?? rawOption.templateAlias //-t 'crud'
  if (alisa != null) return { templateAlias, ...rawOption, route: rawRoute }
  const [head] = rawRoute.split('/')
  const route = isValidHttpMethod(head)
    ? rawRoute
    : ['post', rawRoute].join('/')
  return { templateAlias, ...rawOption, route }
}

const validateByModelOption = (rawOption: ByModelOption) => {
  if (rawOption.templateAlias != null) return rawOption
  throw new Error(
    [
      'Missing template alias, when use --by-model, -t is required',
      'eg: capi --by-model -t crud',
    ].join('\n'),
  )
}

const prepareKindArgs = async (
  opt: RegularOption,
  tempConfig: ApiTemplateType[],
): Promise<Seeds[]> => {
  const { templateAlias, route } = opt
  const targeTemplates = templateAlias
    ? parseByAlias([route], tempConfig, templateAlias)
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
  path.join(opt.testDir, path.basename(opt.apiDir), 'helper.ts')

const getTestFilePath = (
  { apiDir, testDir }: DirInfo,
  { kind, namePaths }: Seeds,
) => `${path.join(testDir, path.basename(apiDir), kind, ...namePaths)}.test.ts`

const getApiFilePath = ({ apiDir }: DirInfo, { kind, namePaths }: Seeds) =>
  `${path.join(apiDir, kind, ...namePaths)}.ts`

const getFileSummary = (filePath: string): Promise<FileSummary> =>
  pathExists(filePath).then(isExists => ({ filePath, isExists }))

const getTestFileSummary = async (
  opt: MergedOption,
  seeds: Seeds,
): Promise<FileSummary> =>
  opt.withTest
    ? await getFileSummary(getTestFilePath(opt, seeds))
    : {
        filePath: getTestFilePath(opt, seeds),
        isExists: true,
      }

const withFileState =
  (opt: MergedOption) =>
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
  opt: MergedOption,
  tempConfig: ApiTemplateType[],
): Promise<FullSeeds[]> =>
  asyncPipe(
    isByModel(opt)
      ? prepareKindArgsByModel(opt, tempConfig)
      : prepareKindArgs(opt, tempConfig),
    map(withFileState(opt)),
    waitAll,
  )

const checkTestHelper = async (
  opt: MergedOption,
): Promise<FullContext['testHelperInfo']> => {
  const filePath = getTestHeplerPath(opt)
  const isExists = opt.withTest ? await pathExists(filePath) : false
  return { isExists, filePath }
}

const toKeyValue =
  <K extends keyof FullContext>(k: K) =>
  (v: FullContext[K]) =>
    [k, v]

const collectContext = asyncFlow(
  loadTemplateConfig,
  ({ config, option }) =>
    [
      getSeeds(option, config.template.handlers).then(toKeyValue('seeds')),
      pipe(
        getTouchedKinds(option, config.template.handlers),
        gatherIndexContent(option.apiDir),
      ).then(toKeyValue('kindIndexContentMap')),
      readIndexFile(path.join(option.apiDir, 'index.ts')).then(
        toKeyValue('topIndexContent'),
      ),
      collectTypeFileInfo(option).then(toKeyValue('typeFileInfo')),
      checkTestHelper(option).then(toKeyValue('testHelperInfo')),
      toKeyValue('testTemplate')(config.template.test),
      toKeyValue('commonOption')(option),
    ] as const,
  waitAll,
  kvs => Object.fromEntries(kvs) as FullContext,
)

const createApis = asyncFlow(
  validateInput,
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
  isByModel,
  parseByAlias,
  parseByRoute,
  prepareKindArgs,
  seeds2kindScope,
  validateRegularOption,
}

export type { ByModelOption, FullContext, OptionTypes, RegularOption, Seeds }
