import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitest/config'
import { VDOC_BASENAME } from '@tealina/doc-ui'
import { invoke } from 'fp-lite'
const fv = invoke<string>(console.log)
// https://vitejs.dev/config/
export default defineConfig(env => ({
  plugins: [react(), UnoCSS()],
  base: fv(env.command === 'build' ? VDOC_BASENAME : '/doc'),
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    deps: {
      optimizer: {
        web: {
          include: ['vitest-canvas-mock'],
        },
      },
    },
    alias: [
      {
        //https://github.com/vitest-dev/vitest/discussions/1806
        find: /^monaco-editor$/,
        replacement: `${__dirname}/node_modules/monaco-editor/esm/vs/editor/editor.api`,
      },
    ],
  },
  build: {
    outDir: '../../packages/tealina-doc-ui/static',
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api-doc': {
        target: 'http://localhost:6000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:6000',
        changeOrigin: true,
      },
    },
  },
}))
