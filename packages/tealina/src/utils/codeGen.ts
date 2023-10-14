import { relative } from 'pathe'
import { DirInfo } from './withTypeFile'

const toRoutePath = (xs: string[]) => {
  const route = xs.map(v => v.replace(/\[-?/, ':').replace(/\]/, '')).join('/')
  // endwith slash for type check when route has params
  return route.includes(':') ? route + '/' : route
}

export const genTopIndexProp =
  (suffix = '') =>
  (dir: string) =>
    `  '${dir}': import('./${dir}/index${suffix}'),`

export const genIndexProp =
  (suffix = '') =>
  (fullPathArr: string[]) =>
    `  '${toRoutePath(fullPathArr)}': import('./${fullPathArr.join(
      '/',
    )}${suffix}'),`

export const genWithWrapper = (contens: string[]) =>
  ['//prettier-ignore', 'export default {', ...contens.sort(), '}', ''].join(
    '\n',
  )

export const genTypeCode = ({ apiDir, typesDir }: DirInfo) => {
  const relativeDotStr = relative(typesDir, apiDir)
  return [
    `import apis from '${relativeDotStr}/index'`,
    `import type { ResolveApiType } from './handler'`,
    '',
    'type RawApis = typeof apis',
    'export type ApiTypesRecord = {',
    "  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>",
    '}',
  ].join('\n')
}
