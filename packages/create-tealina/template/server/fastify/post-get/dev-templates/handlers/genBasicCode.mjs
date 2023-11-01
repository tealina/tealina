// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ relative2api }) =>
  [
    `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
    `import { convention } from '${relative2api}/convention.js'`,
    '',
    `/** TODO: describe what it does */`,
    `const handler: AuthedHandler = async (req, res) => {`,
    '  res.code(200).send()',
    '}',
    '',
    `export default convention(handler)`,
  ].join('\n'),
)
