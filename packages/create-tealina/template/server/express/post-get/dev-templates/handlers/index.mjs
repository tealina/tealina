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
    name: 'create',
    method: 'post',
    generateFn: genCreateCode
  },
  {
    alias: 'r',
    name: 'getList',
    method: 'post',
    generateFn: genReadCode
  },
  {
    alias: 'u',
    name: 'update',
    method: 'post',
    generateFn: genUpdateCode
  },
  {
    alias: 'd',
    name: 'delete',
    method: 'post',
    generateFn: genDeleteCode
  },
  {
    alias: '*', //fallback
    name: '',
    method: 'post',
    generateFn: genBasicCode
  }
])
