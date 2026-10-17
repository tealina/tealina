import chalk from 'chalk'
import consola from 'consola'

type LoggerType = (...args: unknown[]) => void

const isJsonMode = () => process.argv.includes('--json')

const formatError = (logger: LoggerType) => (e: unknown) => {
  const error = e instanceof Error ? e : new Error(String(e))
  const message = process.argv.includes('--verbose')
    ? (error.stack ?? error.message)
    : error.message
  if (isJsonMode()) {
    // A machine reads one JSON object, not a chalk-painted line. Keep stdout clean for
    // the command's own `--json` output and put the failure on stderr.
    console.error(JSON.stringify({ ok: false, error: { message } }))
  } else {
    logger(chalk.red(message))
  }
  // The exit code is the only signal an agent reliably reads. Without this, every
  // failure this function caught looked like success to whatever launched the CLI.
  process.exitCode = 1
}

export const catchError = (
  fn: (...args: unknown[]) => unknown,
  logger: LoggerType = consola.error,
) => {
  try {
    const p = fn()
    if (p instanceof Promise) {
      return p.catch(formatError(logger))
    }
  } catch (error) {
    formatError(logger)(error as Error)
  }
}
