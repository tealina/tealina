import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../../..')

/**
 * The packages the fixtures reach past npm for, built once, here, before Vitest forks a
 * worker.
 *
 * All of them are linked into a fixture by path, so what it resolves is the package's
 * `dist/` — built rather than asserted, because a `dist/` from before the change under test
 * would have the fixture exercise the old behaviour and fail with nothing to say why.
 *
 * It cannot live in the test files, which is where it used to be. A "build once" flag is
 * per *process*, and Vitest runs these files in parallel workers: `e2e.test.ts` and
 * `init.test.ts` each built `tealina`, and a build clears `dist/` before repopulating it.
 * One worker's `tsc` resolving `tealina/utility-types` mid-wipe is a TS2307 for a package
 * that is installed and correct, and the failure lands on whichever fixture happened to be
 * compiling — not on the one doing the building. Building above the workers removes the
 * window instead of narrowing it.
 *
 * CI builds before testing, so there this is a rebuild of what already exists.
 */
const LINKED_PACKAGES = ['tealina', '@tealina/client', '@tealina/server']

export default function setup() {
  for (const name of LINKED_PACKAGES) {
    const res = spawnSync('pnpm', ['-F', name, 'build'], {
      cwd: repoRoot,
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    })
    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()
    if (res.status !== 0) {
      throw new Error(`building ${name} failed:\n${output}`)
    }
  }
}
