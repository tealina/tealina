import { CtxForMakeCode, TemplateSnap } from './ctx'
import { makeBasicCode } from './makeBasic'
import { makeCreationCode } from './makeCreate'
import { makeDeletetionCode } from './makeDeletion'
import { makeIndexCode } from './makeIndex'
import { makeReadCode } from './makeRead'
import { makeUpdateCode } from './makeUpdate'

export const createTemplates = (ctx: CtxForMakeCode): TemplateSnap[] => {
  return [
    {
      filename: 'genBasicCode.mjs',
      code: makeBasicCode(ctx),
    },
    { filename: 'genCreateCode.mjs', code: makeCreationCode(ctx) },
    { filename: 'genReadCode.mjs', code: makeReadCode(ctx) },
    { filename: 'genUpdateCode.mjs', code: makeUpdateCode(ctx) },
    { filename: 'genDeleteCode.mjs', code: makeDeletetionCode(ctx) },
    { filename: 'index.mjs', code: makeIndexCode(ctx) },
  ]
}
