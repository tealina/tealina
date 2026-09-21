import { kStatement, kLines } from './common'
import { type CtxForMakeCode, makeHandlerExp, replyExpression } from './ctx'

export const makeBasicCode = (ctx: CtxForMakeCode) => {
  return [
    'export default makeTemplate(({ relative2api }) =>',
    '  [',
    `    ${kStatement.authHandler},`,
    `    ${kStatement.convention},`,
    "    '',",
    "    '/** TODO: describe what it does */',",
    `'    ${makeHandlerExp(ctx.framwork)}',`,
    `     ${replyExpression[ctx.framwork]}`,
    "    '}',",
    "    '',",
    "    'export default convention(handler)',",
    "    '',",
    "  ].join('\\n')",
    ')',
  ].join('\n')
}
