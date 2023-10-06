import { ApiTemplateType } from '../../../src/index.js'

export const FuncTemplates: ApiTemplateType[] = [
  {
    alias: 'c',
    name: 'create',
    generateFn(ctx) {
      return 'Func style POST create api'
    },
  },
  {
    alias: 'r',
    name: 'getList',
    generateFn(ctx) {
      return 'Func style GET api'
    },
  },
  {
    alias: 'u',
    name: 'update',
    generateFn(ctx) {
      return 'Func style PUT api'
    },
  },
  {
    alias: 'd',
    name: 'delete',
    generateFn(ctx) {
      return 'Func style DELETE api'
    },
  },
  {
    alias: '*',
    name: '',
    generateFn(ctx) {
      return 'basic api handler'
    },
  },
]
