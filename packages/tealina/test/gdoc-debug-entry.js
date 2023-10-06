//@ts-check
import { writeFileSync } from 'fs'
import { generateApiDoc } from '../src/core/gdoc.js'

const doc = generateApiDoc({
  entries: ['temp/express/post-get/server/types/api-v1.d.ts'],
  tsconfigPath: 'temp/express/post-get/server/tsconfig.json',
})
writeFileSync('temp/doc.json', JSON.stringify(doc, null, 2))
