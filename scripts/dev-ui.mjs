#!/usr/bin/env node
/**
 * Run the doc-factory backend watchers and the doc-ui dev server in one terminal.
 *
 * The packages are started by running their binaries directly, not through
 * `pnpm -r --parallel dev` / `concurrently`. Those wrappers treat the signal that
 * stops a dev server as a task failure, so a normal Ctrl+C ends with
 * `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`, `[ELIFECYCLE] Command failed.` and
 * `exited with code 130`. Here Ctrl+C is an expected way to stop: the runner
 * stops the children's process groups and exits 0.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const factory = path.join(repoRoot, 'playground/doc-factory')
const coreDir = path.join(factory, 'backend/core')
const apiDir = path.join(factory, 'backend/api-v1')
const serverDir = path.join(factory, 'backend/server')
const uiDir = path.join(repoRoot, 'packages/tealina-doc-ui-src')

const bin = (packageDir, name) =>
  path.join(packageDir, 'node_modules/.bin', name)

const runToCompletion = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    )
  })

// The server imports both libraries from their dist output, so those have to
// exist before it starts. Their watchers keep them current from here on.
try {
  await runToCompletion('pnpm', ['-C', coreDir, 'build'], repoRoot)
  await runToCompletion('pnpm', ['-C', apiDir, 'build'], repoRoot)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

const children = []

// Each child leads its own process group, so stopping it stops whatever it
// spawned too. `tsx watch` and `vp dev` both run a real server as a grandchild;
// signalling only the direct child would leave that server holding its port.
const start = (name, command, args, cwd) => {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    detached: true,
  })
  children.push({ name, child })
  child.on('error', error => {
    console.error(`${name}: ${error.message}`)
    shutdown(1)
  })
  child.on('exit', (code, signal) => {
    if (stopping) return
    console.error(`${name} exited (${signal ?? code})`)
    shutdown(1)
  })
}

const signalGroup = (child, signal) => {
  try {
    process.kill(-child.pid, signal)
  } catch {
    // The group is already gone.
  }
}

const groupAlive = child => {
  try {
    process.kill(-child.pid, 0)
    return true
  } catch {
    return false
  }
}

let stopping = false
let exitCode = 0

const shutdown = async code => {
  if (stopping) return
  stopping = true
  exitCode = code
  for (const { child } of children) signalGroup(child, 'SIGTERM')
  // Give the dev servers a moment to close their listeners; a group that is
  // still there after that is killed outright.
  const deadline = Date.now() + 1500
  while (
    Date.now() < deadline &&
    children.some(({ child }) => groupAlive(child))
  ) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  for (const { child } of children) signalGroup(child, 'SIGKILL')
  process.exit(exitCode)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start(
  'core',
  bin(coreDir, 'tsc'),
  ['--project', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
  coreDir,
)
start(
  'api-v1',
  bin(apiDir, 'tsc'),
  ['--project', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'],
  apiDir,
)
start('server', bin(serverDir, 'tsx'), ['watch', 'src'], serverDir)
start('doc-ui', bin(uiDir, 'vp'), ['dev'], uiDir)
