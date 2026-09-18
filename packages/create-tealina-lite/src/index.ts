import { createScaffold } from './core.js'

createScaffold().catch(e => {
  if (e === 'Canceled') {
    console.log('Canceled')
    process.exit(0)
  }
  console.error(e)
  process.exit(1)
})
