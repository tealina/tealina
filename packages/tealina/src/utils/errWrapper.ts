import chalk from 'chalk'

export const errWrapper =
  <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (...args: Parameters<T>) =>
    fn(...args).catch(e => {
      console.log(chalk.red(String(e)))
      return
    })
