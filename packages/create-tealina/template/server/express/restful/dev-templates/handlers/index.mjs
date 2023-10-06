// @ts-check
import genCreateCode from './genCreateCode.mjs'
import genUpdateCode from './genUpdateCode.mjs'
import genDeleteCode from './genDeleteCode.mjs'
import genReadCode from './genReadCode.mjs'
import genBasicCode from './genBasicCode.mjs'
import { defineApiTemplates } from 'tealina'

export default defineApiTemplates([
  {
    alias: 'c',
    name: '',
    method: 'post',
    generateFn: genCreateCode,
  },
  {
    alias: 'r',
    name: '',
    method: 'get',
    generateFn: genReadCode,
  },
  {
    alias: 'u',
    name: '[id]',
    method: 'put',
    generateFn: genUpdateCode,
  },
  {
    alias: 'd',
    name: '[id]',
    method: 'delete',
    generateFn: genDeleteCode,
  },
  {
    alias: '*', //fallback
    name: '',
    method: '',
    generateFn: genBasicCode,
  },
])
