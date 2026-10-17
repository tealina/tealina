//@ts-check
import { writeFileSync } from 'fs'
import { parseDeclarationFile } from '../src/utils/parseDeclarationFile.js'
import path from 'path'

const doc = parseDeclarationFile({
  entries: ['temp/koa/backend/api-v1/types/api.d.ts'],
  tsconfigPath: 'temp/koa/backend/api-v1/tsconfig.json',
})
const output = path.resolve('temp/doc.json')
writeFileSync(output, JSON.stringify(doc, null, 2))
