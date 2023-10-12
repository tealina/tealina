import chalk from 'chalk'

type LoggerType = (...args: any[]) => void

const formatError = (logger: LoggerType) => (e: Error) => {
  // console.log(chalk.red(e.message))
  const message = process.argv.includes('--verbose') ? e.stack : String(e)
  logger(chalk.red(message))
}

export const catchError = (
  fn: (...args: any[]) => any,
  logger: LoggerType = console.log,
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
