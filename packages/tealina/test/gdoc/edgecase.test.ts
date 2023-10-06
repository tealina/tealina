import { describe, expect, test } from 'vitest'
import { generateApiDoc } from '../../src/core/gdoc.js'
import path from 'path'

const mockDir = 'packages/tealina/test/gdoc/mock'
describe('test error handling', () => {
  test('invalid ts config', () => {
    try {
      generateApiDoc({
        entries: [path.join(mockDir, 'edgecase', 'api-v1.d.ts')],
        tsconfigPath: path.join(mockDir, 'tsconfig2.json'),
      })
    } catch (error) {
      expect(String(error)).includes('Error')
    }
  })
  test('error when no export found', () => {
    let hasError = false
    try {
      generateApiDoc({
        entries: [path.join(mockDir, 'edgecase', 'error-case.d.ts')],
        tsconfigPath: path.join(mockDir, 'tsconfig.json'),
      })
    } catch (error) {
      hasError = true
      expect(String(error)).includes('Export symbol not found')
    }
    expect(hasError).true
  })
  test('error when no valid export found', () => {
    let hasError = false
    try {
      generateApiDoc({
        entries: [path.join(mockDir, 'edgecase', 'error-case2.d.ts')],
        tsconfigPath: path.join(mockDir, 'tsconfig.json'),
      })
    } catch (error) {
      hasError = true
      console.log(String(error))
      expect(String(error)).includes('Export default should be a function')
    }
    expect(hasError).true
  })
})
