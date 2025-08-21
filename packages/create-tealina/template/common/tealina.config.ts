import { defineConfig } from 'tealina'

export default defineConfig({
  testDir: 'test-integration',
  typesDir: 'types',
  gtype: {
    output: '../shared-type/pure.d.ts',
  },
})
