import { defineConfig } from '../../../src/index.js'
import { RestfulCRUD } from './restfulCRUD.js'

export default defineConfig({
  template: {
    handlers: RestfulCRUD,
    test: {
      genSuite: ctx =>
        ['import {describe} from "vitest"', 'describe.skip(()=>{})'].join('\n'),
      genHelper: ctx => 'const me = "test helper"',
    },
  },
  testDir: '',
  typesDir: '',
})
