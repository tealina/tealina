import { exec } from 'child_process'
import { existsSync, rmSync } from 'fs'
import path from 'path'
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
      const p = exec(command, {
        cwd,
        windowsHide: true,
      })
      process.on('SIGINT', () => {
        p.kill('SIGINT')
        res()
      })
      p.on('exit', code => {
        if (code != 0) {
          rej(new Error(`Exce command failed: ${command}`))
          return
        }
        res()
      })
      p.on('error', e => {
        console.log(`Error when exce command:${command}`)
        rej(e)
      })
      p.on('close', () => {
        res()
      })
    })

export async function validate(dir: string) {
  const cwd = path.join(dir, 'server')
  const $ = prepareExecFn(cwd)
  await $`node init-dev.mjs`
  await $`pnpm tsc --noEmit`
  await $`pnpm test -- --run --testTimeout=0`
}
