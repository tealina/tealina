import { defineConfig } from 'tealina'

export default defineConfig({
  typesDir: 'types',
  gtype: {
    output: '../shared-type/pure.d.ts',
  },
})
