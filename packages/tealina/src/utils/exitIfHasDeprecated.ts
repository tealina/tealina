import consola from 'consola'

const isDeprecateUsage = (leader: string) => {
  if (leader == 'capi') {
    consola.warn(
      [
        'capi is deprecated, without capi and try again,',
        'and use -t if you need template alias',
        'eg: yarn v1 user -t crud',
      ].join('\n'),
    )
    return true
  }
  if (leader == 'sapi') {
    consola.warn(
      [
        'sapi is deprecated, use -a or --align instead,', //
        'eg: yarn v1 -a',
      ].join('\n'),
    )
    return true
  }
  if (leader == 'dapi') {
    consola.warn(
      [
        'dapi is deprecated, without dapi and use -d instead,',
        'eg: yarn v1 user -t crud -d',
      ].join('\n'),
    )
    return true
  }
  if (leader == 'gpure') {
    consola.warn(
      [
        'gpure is deprecated, use gtype instead,', //
        'eg: yarn v1 gtype',
      ].join('\n'),
    )
    return true
  }
}

export const exitIfHasDeprecated = (
  apiDir: string,
  route: string,
  options: Record<string, any>,
) => {
  if ('apiDir' in options) {
    consola.warn(
      [
        '--api-dir is deprecated, update your package.json:',
        'before: "v1": "tealina --api-dir src/api-v1"',
        'after:  "v1": "tealina src/api-v1"',
      ].join('\n'),
    )
  }
  if (isDeprecateUsage(apiDir) || isDeprecateUsage(route)) {
    return process.exit(1)
  }
}
