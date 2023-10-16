// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(
  ({ Filename: Model, relative2api, filename: model }) => {
    const imps = [
      `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
      `import type { Pure } from '${relative2api}/../types/pure'`,
      `import { ${Model} } from '@prisma/client'`,
      `import { convention } from '${relative2api}/convention'`,
      `import { db } from '${relative2api}/db/prisma'`,
    ]
    const codes = [
      `type ApiType = AuthedHandler<{ body: Pure.${Model}CreateInput; }, ${Model}>`,
      '',
      `/** Create one ${Model} */`,
      `const handler: ApiType = async (req, res) => {`,
      `  const result = await db.${model}.create({`,
      '    data: req.body,',
      '  })',
      '  res.send(result)',
      '}',
      '',
      `export default convention(handler)`,
    ]
    return [...imps, '', ...codes].join('\n')
  },
)
