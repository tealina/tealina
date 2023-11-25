import { CtxForMakeCode } from './ctx'

const imps = [
  '// @ts-check',
  "import genCreateCode from './genCreateCode.mjs'",
  "import genUpdateCode from './genUpdateCode.mjs'",
  "import genDeleteCode from './genDeleteCode.mjs'",
  "import genReadCode from './genReadCode.mjs'",
  "import genBasicCode from './genBasicCode.mjs'",
  "import { defineApiTemplates } from 'tealina'",
  '',
]

const restfulStyle = {
  create: ["    name: '',", "    method: 'post',"],
  read: ["    name: '',", "    method: 'get',"],
  update: ["    name: '[id]',", "    method: 'put',"],
  dele: ["    name: '[id]',", "    method: 'delete',"],
}
const postGetStyle = {
  create: ["    name: 'create',", "    method: 'post',"],
  read: ["    name: 'getList',", "    method: 'post',"],
  update: ["    name: 'update',", "    method: 'post',"],
  dele: ["    name: 'delete',", "    method: 'post',"],
}

export const makeIndexCode = (ctx: CtxForMakeCode) => {
  const actual = ctx.isRestful ? restfulStyle : postGetStyle
  return [
    imps,
    'export default defineApiTemplates([',
    '  {',
    "    alias: 'c',",
    actual.create,
    '    generateFn: genCreateCode,',
    '  },',
    '  {',
    "    alias: 'r',",
    actual.read,
    '    generateFn: genReadCode,',
    '  },',
    '  {',
    "    alias: 'u',",
    actual.update,
    '    generateFn: genUpdateCode,',
    '  },',
    '  {',
    "    alias: 'd',",
    actual.dele,
    '    generateFn: genDeleteCode,',
    '  },',
    '  {',
    "    alias: '*', //fallback",
    "    name: '',",
    "    method: 'post',",
    '    generateFn: genBasicCode,',
    '  },',
    '])',
  ]
    .flat()
    .join('\n')
}
