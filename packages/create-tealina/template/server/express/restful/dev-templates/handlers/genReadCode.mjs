// @ts-check
import { makeTemplate } from 'tealina'

export default makeTemplate(
  ({ Filename: Model, relative2api, filename: model }) => {
    const imps = [
      `import { ${Model} } from '@prisma/client'`,
      `import { db } from '${relative2api}/db/prisma'`,
      `import type { AuthedHandler } from '${relative2api}/../types/handler'`,
      `import type {`,
      `  PageResult,`,
      `  RawFindManyArgs,`,
      `} from '${relative2api}/../types/common'`,
      `import { findManyArgsZ } from '${relative2api}/validate/findManyArgs'`,
    ]
    const codes = [
      `type ApiType = AuthedHandler<{ query: RawFindManyArgs } ,PageResult<${Model}>>`,
      '',
      `const getList: ApiType = async (req, res) => {`,
      `  const query = findManyArgsZ.parse(req.query)`,
      '  const [total, datas] = await db.$transaction([',
      `    db.${model}.count({ where: query.where }),`,
      `    db.${model}.findMany(query),`,
      '  ])',
      '  res.send({ total, datas })',
      '}',
      '',
      `export default getList`,
    ]
    return [...imps, '', ...codes].join('\n')
  },
)
