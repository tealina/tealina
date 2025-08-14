import { relative } from 'pathe'
import type { DirInfo } from './withTypeFile'

const toRoutePath = (xs: string[]) => {
  const route = xs.map(v => v.replace(/\[/, ':').replace(/\]/, '')).join('/')
  return route
}

export const genTopIndexProp =
  (suffix = '') =>
  (dir: string) =>
    `  '${dir}': import('./${dir}/index${suffix}'),`

export const genIndexProp =
  (suffix = '') =>
  (fullPathArr: string[]) => {
    const key = toRoutePath(fullPathArr)
    return `  '/${key}': import('./${fullPathArr.join('/')}${suffix}'),`
  }

export const genWithWrapper = (contens: string[]) =>
  ['export default {', ...contens.sort(), '}', ''].join('\n')

export const genTypeCode = (
  { apiDir, typesDir }: Omit<DirInfo, 'testDir'>,
  suffix: string,
) => {
  const relativeDotStr = relative(typesDir, apiDir)
  return [
    `import apis from '${relativeDotStr}/index${suffix}'`,
    `import type { ResolveApiType } from './handler${suffix}'`,
    '',
    'type RawApis = typeof apis',
    'export type ApiTypesRecord = {',
    "  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>",
    '}',
    '',
  ].join('\n')
}
