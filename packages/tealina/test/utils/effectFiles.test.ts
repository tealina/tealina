import { existsSync, rmSync } from 'fs'
import path from 'path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { Snapshot, effectFiles } from '../../src/utils/effectFiles.js'
import { ensureWrite } from '../../src/utils/tool.js'

const tempDir = 'temp/effect'
const join = (tail: string) => path.join(tempDir, tail)

describe('test delete', () => {
  beforeAll(() => {
    ensureWrite(join('empty/x1.ts'), 'sdafd')
    ensureWrite(join('empty/x2.ts'), 'sdafd')
  })
  afterAll(() => rmSync(tempDir, { recursive: true }))
  test('delete files', () => {
    const snapshots: Snapshot[] = [
      { group: 'api', filePath: join('empty/x1.ts'), action: 'deleted' },
      { group: 'test', filePath: join('empty/x2.ts'), action: 'deleted' },
    ]
    effectFiles(snapshots)
    snapshots.forEach(
      p =>
        expect(existsSync(p.filePath), `${p.filePath} should not exists`).false,
    )
  })
  test('create files', () => {
    const snapshots: Snapshot[] = [
      {
        group: 'api',
        filePath: join('create/x1.ts'),
        action: 'created',
        code: 'mock code',
      },
      {
        group: 'test',
        filePath: join('create/deep/x2.ts'),
        action: 'created',
        code: 'mock code',
      },
    ]
    effectFiles(snapshots)
    snapshots.forEach(
      p => expect(existsSync(p.filePath), `${p.filePath} should exists`).true,
    )
  })
})
