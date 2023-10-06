import path from 'path'
import { DirInfo } from './withTypeFile.js'

const toRoutePath = (xs: string[]) => {
  const route = xs.map(v => v.replace(/\[-?/, ':').replace(/\]/, '')).join('/')
  // endwith slash for type check when route has params
  return route.includes(':') ? route + '/' : route
}

export const genTopIndexProp = (dir: string) =>
  `  '${dir}': import('./${dir}/index.js'),`

export const genIndexProp = (fullPathArr: string[]) =>
  `  '${toRoutePath(fullPathArr)}': import('./${fullPathArr.join('/')}.js'),`

export const genWithWrapper = (contens: string[]) =>
  ['//prettier-ignore', 'export default {', ...contens.sort(), '}', ''].join(
    '\n',
  )

export const genTypeCode = ({ apiDir, typesDir }: DirInfo) => {
  const relativeDotStr = path.relative(typesDir, apiDir)
  return [
    `import apis from '${relativeDotStr}/index.js'`,
    `import type { ResolveApiType } from './handler.js'`,
    '',
    'type RawApis = typeof apis',
    'export type ApiTypesRecord = {',
    "  [Method in keyof RawApis]: ResolveApiType<Awaited<RawApis[Method]>['default']>",
    '}',
  ].join('\n')
}
