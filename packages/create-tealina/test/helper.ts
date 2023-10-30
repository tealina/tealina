import { exec, spawn, spawnSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import path from 'node:path'
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
      // p.stdout.on('data', chunk => {
      //   const msg = chunk.toString()
      //   console.log(msg)
      // })
      const errMsgLines: string[] = []
      p.stderr.on('data', c => {
        errMsgLines.push(c.toString())
      })
      p.on('close', code => {
        if (code == 0) return res()
        return rej(new Error(errMsgLines.join('\n')))
      })
    })

export async function validate(dir: string) {
  const cwd = path.join(dir, 'server')
  const $ = prepareExecFn(cwd)
  await $`pnpm install .` //workspace
  // await $`node init-dev.mjs`
  await $`pnpm prisma db push`
  await $`pnpm v1 gpure`
  await $`pnpm v1 capi get/health --with-test`
  await $`pnpm v1 gdoc`
  await $`pnpm test -- --run --testTimeout=0`
  await $`pnpm tsc --noEmit`
}
