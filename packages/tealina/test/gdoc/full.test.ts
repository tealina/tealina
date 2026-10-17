import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, expect, test, vi } from 'vite-plus/test'
import { cli } from '../../src/commands/index.js'

const mockDir = 'test/gdoc/mock'
const apiDir = 'api-v1'
const outputDir = 'temp'

const input = path.join(`${mockDir}/basic`)
const output = path.join(`${outputDir}/${apiDir}.json`)
const cleanOutput = () => {
  if (existsSync(output)) {
    rmSync(path.join(output))
  }
}
beforeAll(cleanOutput)

afterAll(cleanOutput)

const runGdoc = (...extra: string[]) => {
  // The parse call is here for its registration side effect; the run is what matters.
  cli.parse(
    [
      '',
      'tealina',
      apiDir,
      'gdoc',
      '-i',
      input,
      '--output',
      outputDir,
      '--tsconfig-path',
      path.join(mockDir, 'tsconfig.json'),
      '--config-path',
      path.join(mockDir, 'tealina.config.mjs'),
      ...extra,
    ],
    { run: false },
  )
  return cli.runMatchedCommand()
}

test('actual run gdoc', () => {
  return runGdoc()
})

test('--check passes when the document is current', async () => {
  await runGdoc()
  const originalExit = process.exitCode
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  try {
    await runGdoc('--check', '--json')
    expect(process.exitCode).eq(originalExit)
    expect(JSON.parse(String(log.mock.lastCall?.[0]))).toEqual({
      ok: true,
      changed: [],
    })
  } finally {
    log.mockRestore()
    process.exitCode = originalExit
  }
})

test('--json reports the file a normal run wrote', async () => {
  cleanOutput()
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  try {
    await runGdoc('--json')
    const body = JSON.parse(String(log.mock.lastCall?.[0]))
    expect(body).contains({ ok: true })
    expect(body.changed).toEqual([{ action: 'create', file: output }])
    expect(existsSync(output)).eq(true)
  } finally {
    log.mockRestore()
  }
})

test('--check fails without writing when the document is missing', async () => {
  cleanOutput()
  const originalExit = process.exitCode
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  try {
    await runGdoc('--check', '--json')
    expect(process.exitCode).eq(1)
    expect(existsSync(output)).eq(false)
    expect(JSON.parse(String(log.mock.lastCall?.[0]))).contains({ ok: false })
  } finally {
    log.mockRestore()
    process.exitCode = originalExit
  }
})
