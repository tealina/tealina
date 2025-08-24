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
  // return runScripts(dir)
  const rootPkg = path.join(dir, 'package.json')
  const packagesDir = path.join(dir, 'packages')
  const serverDir = path.join(dir, 'packages/server')
  const shareTypesDir = path.join(dir, 'packages/shared-type')
  const workspaceFile = path.join(dir, 'pnpm-workspace.yaml')
  expect(existsSync(rootPkg)).true
  expect(existsSync(packagesDir)).true
  expect(existsSync(workspaceFile)).true
  expect(existsSync(serverDir)).true
  expect(existsSync(shareTypesDir)).true
  console.log('test done')
}
