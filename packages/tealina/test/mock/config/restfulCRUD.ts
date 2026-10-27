import { ApiTemplateType } from '../../../src/index.js'

export const RestfulCRUD: ApiTemplateType[] = [
  {
    alias: 'c',
    name: '',
    method: 'post',
    generateFn(_ctx) {
      return 'Restful POST create api'
    },
  },
  {
    alias: 'r',
    name: '',
    method: 'get',
    generateFn(_ctx) {
      return 'Restful GET api'
    },
  },
  {
    alias: 'u',
    method: 'put',
    name: '[id]',
    generateFn(_ctx) {
      return 'Restful PUT api'
    },
  },
  {
    alias: 'd',
    method: 'delete',
    name: '[id]',
    generateFn(_ctx) {
      return 'Restful DELETE api'
    },
  },
  {
    alias: '*',
    method: '*',
    name: '',
    generateFn(_ctx) {
      return 'basic api handler'
    },
  },
]
