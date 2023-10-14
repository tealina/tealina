// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api }) =>
  [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    '',
    `const handler: AuthedHandler = async (req, res) => {`,
    '  res.code(200).send()',
    '}',
    '',
    `export default handler`,
  ].join('\n'),
)
