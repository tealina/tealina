import react from '@vitejs/plugin-react'
import { setTimeout } from 'timers/promises'
import UnoCSS from 'unocss/vite'
import { defineConfig, lazyPlugins } from 'vite-plus'
import axios from 'axios'
import path from 'path/posix'

const kDocFactory = 'http://localhost:6001'
type RemoteConfig = { customScripts?: string[] } & Record<string, unknown>
let kConfigPromise: Promise<RemoteConfig | undefined> | null = null
const getRemoteConfig = async (): Promise<RemoteConfig | undefined> => {
  if (kConfigPromise) return kConfigPromise
  await setTimeout(1000)
  const pending = axios
    .get<RemoteConfig>(`${kDocFactory}/api-doc/config.json`)
    .then(res => res.data)
    .catch(e => {
      console.log(e)
      return undefined
    })
  kConfigPromise = pending
  return pending
}

// https://vitejs.dev/config/
export default defineConfig(env => ({
  plugins: lazyPlugins(async () => [
    react(),
    UnoCSS(),
    {
      name: 'inject-tealina-config',
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler: async (html: string) => {
          try {
            const { customScripts = [], ...json } =
              (await getRemoteConfig()) ?? {}
            const index = html.indexOf('<div') - 4
            const left = html.slice(0, index)
            return [
              left,
              ...customScripts.map(
                url => `<script src="${path.join('/api-doc', url)}"></script>`,
              ),
              `<script> window.TEALINA_VDOC_CONFIG =  ${JSON.stringify(json)}</script>`,
              html.slice(index),
            ].join('\n')
          } catch (error) {
            console.log(error)
          }
        },
      },
    },
  ]),
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
