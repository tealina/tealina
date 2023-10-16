// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {
  const imps = [
    `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
    `import type { Pure } from '${relative2api}/../types/pure'`,
    `import { ${Model} } from '@prisma/client'`,
    `import { convention } from '${relative2api}/convention'`,
    `import { db } from '${relative2api}/db/prisma'`,
  ]
  const codes = [
    `type ApiType = AuthedHandler<{ body: Pure.${Model}CreateInput }, ${Model}>`,
    '',
    `/** Create ${Model} */`,
    `const create: ApiType = async (req, res) => {`,
    `  const result = await db.${model}.create({`,
    '    data: req.body,',
    '  })',
    '  res.send(result)',
    '}',
    '',
    `export default convention(create)`,
  ]
  return [...imps, '', ...codes].join('\n')
})
