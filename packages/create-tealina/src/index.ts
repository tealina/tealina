import { createScaffold } from './core.js'

createScaffold().catch(e => {
  if (e === 'Canceled') {
    console.log('Canceled')
    process.exit(0)
  }
  // The messages that get here say what to fix, so a stack would only be noise.
  console.error(e)
  process.exit(1)
})
