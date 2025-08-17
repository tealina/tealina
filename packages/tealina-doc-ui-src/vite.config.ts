import react from '@vitejs/plugin-react'
import { setTimeout } from 'timers/promises'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitest/config'
import axios from 'axios'

const kDocFactory = 'http://localhost:6000'
let kConfigPromise = null
const getRemoteConfig = async () => {
  if (kConfigPromise) return kConfigPromise
  kConfigPromise = await setTimeout(1000).then(() =>
    axios
      .get(`${kDocFactory}/api-doc/config.json`)
      .then(res => res.data)
      .catch(e => {
        console.log(e)
      }),
  )
  return kConfigPromise
}

// https://vitejs.dev/config/
export default defineConfig(env => ({
  plugins: [
    react(),
    UnoCSS(),
    {
      name: 'inject-tealina-config',
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler: async html => {
          try {
            const json = await getRemoteConfig()
            const index = html.indexOf('<div') - 4
            const left = html.slice(0, index)
            return [
              left,
              `<script> window.TEALINA_VDOC_CONFIG =  ${JSON.stringify(json)}</script>`,
              html.slice(index),
            ].join('\n')
          } catch (error) {
            console.log(error)
          }
        },
      },
    },
  ],
  // base: fv(env.command === 'build' ? VDOC_BASENAME : '/doc'),
  base: './',
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
  },

  server: {
    proxy: {
      '/api-doc': {
        target: kDocFactory,
        changeOrigin: true,
      },
      '/api': {
        target: kDocFactory,
        changeOrigin: true,
      },
    },
  },
}))
