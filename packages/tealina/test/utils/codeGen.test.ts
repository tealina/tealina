import { expect, test } from 'vite-plus/test'
import { genTypeCode } from '../../src/utils/codeGen'

const base = { apiDir: 'src/api', typesDir: 'types' }

test('the fallback type file imports the sibling handler module by default', () => {
  const code = genTypeCode(base, '.js')
  expect(code).toContain("} from './handler.js'")
})

test('handlerImport replaces the specifier verbatim', () => {
  const code = genTypeCode({ ...base, handlerImport: 'core/handler' }, '.js')
  expect(code).toContain("} from 'core/handler'")
  expect(code).not.toContain('./handler.js')
})
