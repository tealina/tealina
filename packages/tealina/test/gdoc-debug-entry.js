//@ts-check
import { writeFileSync } from 'node:fs'
import { parseDeclarationFile } from '../src/utils/parseDeclarationFile.js'

const doc = parseDeclarationFile({
  entries: ['temp/fastify/restful/server/types/api-v1.d.ts'],
  tsconfigPath: 'temp/express/post-get/server/tsconfig.json',
})
writeFileSync('temp/doc.json', JSON.stringify(doc, null, 2))
