import { relative } from 'pathe'
import type { DirInfo } from './withTypeFile'

const toRoutePath = (xs: string[]) => {
  const route = xs.map(v => v.replace(/\[/, ':').replace(/\]/, '')).join('/')
  return route
}

const IdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/**
 * A key is written bare when it is a plain identifier and quoted otherwise — `health`, but
 * `user/create` and `user/:id`. This is the same judgement a formatter makes when it walks
 * the file afterwards, so a generated barrel is already in the shape one would leave it in:
 * formatting the tree produces no diff, and `align` does not rewrite what a formatter wrote.
 */
const toPropKey = (key: string) =>
  IdentifierPattern.test(key) ? key : `'${key}'`

export const genTopIndexProp =
  (suffix = '') =>
  (dir: string) =>
    `  ${toPropKey(dir)}: import('./${dir}/index${suffix}'),`

export const genIndexProp =
  (suffix = '') =>
  (fullPathArr: string[]) => {
    const key = toRoutePath(fullPathArr)
    return `  ${toPropKey(key)}: import('./${fullPathArr.join('/')}${suffix}'),`
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
