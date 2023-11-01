// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(
  ({ Filename: Model, relative2api, filename: model }) => {
    const imps = [
      `import type { AuthedHandler } from '${relative2api}/../types/handler.js'`,
      `import type {`,
      `  PageResult,`,
      `  RawFindManyArgs,`,
      `} from '${relative2api}/../types/common.js'`,
      `import { ${Model} } from '@prisma/client'`,
      `import { convention } from '${relative2api}/convention.js'`,
      `import { db } from '${relative2api}/db/prisma.js'`,
      `import { findManyArgsZ } from '${relative2api}/validate/findManyArgs.js'`,
    ]
    const codes = [
      `type ApiType = AuthedHandler<{ query: RawFindManyArgs } ,PageResult<${Model}>>`,
      '',
      `/** Get page datas from ${Model} */`,
      `const handler: ApiType = async (req, res) => {`,
      `  const query = findManyArgsZ.parse(req.query)`,
      '  const [total, datas] = await db.$transaction([',
      `    db.${model}.count({ where: query.where }),`,
      `    db.${model}.findMany(query),`,
      '  ])',
      '  res.send({ total, datas })',
      '}',
      '',
      `export default convention(handler)`,
    ]
    return [...imps, '', ...codes].join('\n')
  },
)
