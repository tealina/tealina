import chalk from 'chalk'
import { map, pipe, separeBy, unique } from 'fp-lite'
import { Snapshot } from './effectFiles'
import consola from 'consola'

interface LogConfig {
  leading: string
  colorFn: (x: string) => string
}

const LOG_CONFIG: Record<Snapshot['action'], LogConfig> = {
  created: { leading: '+', colorFn: chalk.green },
  deleted: { leading: '-', colorFn: chalk.red },
  updated: { leading: '^', colorFn: chalk.cyan },
}

const logByAction = (effects: Snapshot[]) => {
  const { leading, colorFn } = LOG_CONFIG[effects[0].action]
  pipe(
    effects,
    map(v => v.filePath),
    unique,
    map(v => [leading, v].join('  ')),
    map(colorFn),
    xs => xs.join('\n'),
    x => (x.length > 0 ? console.log(x) : null),
  )
}

const logByGroup = (effects: Snapshot[]): void => {
  console.group(effects[0].group)
  pipe(
    effects,
    separeBy(v => v.action),
    map(logByAction),
  )
  console.groupEnd()
}

export const logResults = (results: Snapshot[]) => {
  if (results.length == 0) {
    consola.info(chalk.green('Nothing changed'))
    return results
  }
  pipe(
    results,
    separeBy(v => v.group),
    map(logByGroup),
  )
  return results
}
