import { CtxForMakeCode, replyExpression } from './ctx'

export const makeBasicCode = (ctx: CtxForMakeCode) => {
  return [
    'export default makeTemplate(({ relative2api }) =>',
    '  [',
    "    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,",
    "    `import { convention } from '${relative2api}/convention.js'`,",
    "    '',",
    '    `/** TODO: describe what it does */`,',
    '    `const handler: AuthedHandler = async (req, res) => {`,',
    `     ${replyExpression[ctx.framwork]}`,
    "    '}',",
    "    '',",
    '    `export default convention(handler)`,',
    "    '',",
    "  ].join('\\n')",
    ')',
  ].join('\n')
}
