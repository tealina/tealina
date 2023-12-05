import { exec, spawn, spawnSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import path from 'node:path'
import { expect } from 'vitest'
import { beforeAll } from 'vitest'

export const TEMP_ROOT = 'temp'
export function cleanDir(dir: string) {
  beforeAll(() => {
    if (existsSync(dir)) {
      console.log('remove dir: ', dir)
      rmSync(dir, { recursive: true })
    }
  })
}

const prepareExecFn =
  (cwd: string) =>
  (...noDynamicArgsInput: any[]) =>
    new Promise<void>((res, rej) => {
      const command = noDynamicArgsInput[0][0]
      console.log('executing =>', command)
      const [leader, ...args] = command.split(' ')
      const p = spawn(leader, args, {
        cwd,
      })
      const messageLines: string[] = []
      p.stdout.on('data', chunk => {
        messageLines.push(chunk.toString())
        if (messageLines.length > 20) {
          messageLines.shift()
        }
      })

      p.on('close', code => {
        if (code == 0) return res()
        return rej(messageLines.join('\n'))
      })
      p.on('error', err => {
        console.log('==>', err)
        return rej(messageLines.join('\n'))
      })
    })

const runScripts = async (dir: string) => {
  const cwd = path.join(dir)
  const $ = prepareExecFn(cwd)
  await $`pnpm install .` //workspace
  // await $`node init-dev.mjs`
  await $`pnpm prisma db push`
  await $`pnpm v1 gtype`
  await $`pnpm v1 get/status`
  await $`pnpm v1 user -t crud`
  await $`pnpm v1 gdoc`
  // await $`pnpm tsc --noEmit`
}

export async function validate(dir: string) {
  return runScripts(dir)
  const serverPkg = path.join(dir, 'package.json')
  const devTemplateDir = path.join(dir, 'dev-templates')
  const serverTypesDir = path.join(dir, 'types')
  expect(existsSync(serverPkg)).true
  expect(existsSync(devTemplateDir)).true
  expect(existsSync(serverTypesDir)).true
  console.log('test done')
}
