import { defineConfig } from '../../../src/index.js'
import { FuncTemplates } from './funcCRUD.js'

export default defineConfig({
  template: {
    handlers: FuncTemplates,
    test: {
      genSuite: _ctx =>
        ['import {describe} from "vitest"', 'describe.skip(()=>{})'].join('\n'),
      genHelper: _ctx => 'const me = "test hepler"',
    },
  },
  testDir: '',
  typesDir: '',
  apiDir: 'src/api',
  apiBaseURL: '/api',
})
