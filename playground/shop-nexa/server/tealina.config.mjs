// @ts-check
import { defineConfig } from 'tealina'
import apiTemplates from './dev-templates/handlers/index.mjs'
import { genTestSuite, genTestHelper } from './dev-templates/test/index.mjs'

export default defineConfig({
  template: {
    handlers: apiTemplates,
    test: {
      genSuite: genTestSuite,
      genHelper: genTestHelper,
    },
  },
  gpure: {
    overwrite: {
      excludeProps: [
        {
          blockName: '*',
          keyword: 'model',
          kind: 'CreateInput',
          predicate: p => p.name == 'id',
        },
      ],
      isOptional: [
        {
          blockName: '*',
          keyword: 'type',
          kind: 'CreateInput',
          predicate: prop => prop.name == 'id',
        },
      ],
      transofrmType: [
        {
          blockName: '*',
          keyword: '',
          kind: 'CreateInput',
          transform: p => (p.type == 'Date' ? 'string' : p.type),
        },
      ],
    },
    typeRemap: type => {
      switch (type) {
        case 'Date':
          return 'number | string'
        //  ....
        default:
          // retrun null fallback to default stategy
          return null
      }
    },
  },
  testDir: 'test-integration',
  typesDir: 'types',
})
