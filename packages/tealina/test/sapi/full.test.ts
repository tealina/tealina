import { unique } from 'fp-lite'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AlignOption, syncApiByFile } from '../../src/commands/sapi.js'
import { getApiTypeFilePath } from '../../src/utils/withTypeFile.js'

export function emptyDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    return
  }

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    fs.rmSync(fullPath, {
      recursive: true,
      force: true,
    })
  }
}

export function pathExistsSync(p: string) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}
describe('test sapi in mock dir', function () {
  const tempDir = 'temp/sapi/full'
  const apiDir = path.join(tempDir, '/api')
  const apiTypesDir = path.join(tempDir, '/types')
  const ctx: AlignOption = {
    apiDir,
    typesDir: apiTypesDir,
    suffix: '.js',
  }

  beforeAll(() => {
    emptyDirSync(tempDir)
    fs.mkdirSync(apiTypesDir, { recursive: true })
  })

  afterAll(x => {
    if (x.tasks.every(v => v.result?.state != 'fail')) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('should auto genereate missing files', async () => {
    const apiFilePath = path.join(apiDir, 'post', 'user', '/create.ts')
    const dotFilePath = path.join(apiDir, 'post', 'user', '.ignore.ts')
    ensureWrite(apiFilePath, 'export default null')
    ensureWrite(dotFilePath, 'export default null')
    const result = await syncApiByFile(ctx)
    const typeFile = path.join(
      getApiTypeFilePath({ typesDir: ctx.typesDir, apiDir }),
    )
    const uniqued = unique([
      path.join(ctx.apiDir, 'index.ts'),
      path.join(apiDir, 'post', 'index.ts'),
      typeFile,
    ])
    expect(uniqued.length).eq(result.length)
    fs.rmSync(typeFile)
    const result2 = await syncApiByFile(ctx)
    expect(result2.length).eq(1)
  })

  it('api can constains params', async () => {
    const validApi = path.join(ctx.apiDir, 'get', 'user', '[id].ts')
    ensureWrite(validApi, 'fake api handler')
    const result = await syncApiByFile(ctx)
    expect(result.length).gte(1)
    fs.rmSync(validApi)
  })

  it('should error when use invalid kind', async () => {
    const invalidDir = path.join(ctx.apiDir, 'dummy')
    fs.mkdirSync(invalidDir, { recursive: true })
    const err = await syncApiByFile(ctx).catch(e => e)
    expect(err).not.null
    fs.rmSync(invalidDir, { recursive: true })
  })
})

function ensureWrite(dest: string, content: string) {
  const dir = path.dirname(dest)
  if (pathExistsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(dest, content)
}
