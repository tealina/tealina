import { ApiTemplateType } from '../../../src/index.js'

export const FuncTemplates: ApiTemplateType[] = [
  {
    alias: 'c',
    name: 'create',
    generateFn(_ctx) {
      return 'Func style POST create api'
    },
  },
  {
    alias: 'r',
    name: 'getList',
    generateFn(_ctx) {
      return 'Func style GET api'
    },
  },
  {
    alias: 'u',
    name: 'update',
    generateFn(_ctx) {
      return 'Func style PUT api'
    },
  },
  {
    alias: 'd',
    name: 'delete',
    generateFn(_ctx) {
      return 'Func style DELETE api'
    },
  },
  {
    alias: '*',
    name: '',
    generateFn(_ctx) {
      return 'basic api handler'
    },
  },
]
