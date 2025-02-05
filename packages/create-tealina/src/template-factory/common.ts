export const kStatement = {
  authHandler:
    "`import type { AuthedHandler } from '${relative2api}/../types/handler.js'`",
  pure: "import type { Pure } from '@shared/type'",
  convention: "`import { convention } from '${relative2api}/convention.js'`",
  db: "`import { db } from '${relative2api}/db/prisma.js'`",
  handler: 'const handler: ApiType = async (req, res) => {',
  impModelId: [
    "    `import type { ModelId } from '${relative2api}/../types/common.js'`,",
  ],
}

export const kLines = {
  tail: [
    "    '}',",
    "    '',",
    "    'export default convention(handler)',",
    "    '',",
    '  ]',
    "  return [...imps, '', ...codes].join('\\n')",
    '})',
  ],
}

export const kLeadFn = {
  postGet: [
    'export default makeTemplate(({ Dir: Model, relative2api, dir: model }) => {',
  ],
  restFul: [
    'export default makeTemplate(',
    '  ({ Filename: Model, relative2api, filename: model }) => {',
  ],
}

export const kRestfulImps = [
  "    `import type { RawId } from '${relative2api}/../types/common.js'`,",
  "    `import { modelIdZ } from '${relative2api}/validate/modelId.js'`,",
]
