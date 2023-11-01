import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseDeclarationFile } from '../../src/utils/parseDeclarationFile.js'

const mockDir = 'test/gdoc/mock'
describe('test error handling', () => {
  test('invalid ts config', () => {
    try {
      parseDeclarationFile({
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
      parseDeclarationFile({
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
      parseDeclarationFile({
        entries: [path.join(mockDir, 'edgecase', 'error-case2.d.ts')],
        tsconfigPath: path.join(mockDir, 'tsconfig.json'),
      })
    } catch (error) {
      hasError = true
      expect(String(error)).includes('Export default should be a function')
    }
    expect(hasError).true
  })
})
