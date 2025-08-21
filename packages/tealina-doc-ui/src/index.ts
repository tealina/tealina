import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type CommonFieldsType = Partial<
  Record<
    'headers' | 'query' | 'body' | 'params',
    Record<
      string,
      | 'number'
      | 'string'
      | {
          type: 'number'
          default?: number
        }
      | {
          type: 'string'
          default?: string
        }
    >
  >
>

type RequestConfig = {
  method: string
  url: string
} & Partial<Record<'body' | 'headers' | 'query' | 'params', unknown>>

type CustomRequestHandler = (
  requestConfig: RequestConfig,
  setResult: (result: {
    statusCode: number
    code: string
    isError: boolean
  }) => void,
) => Promise<unknown>

type CustomRequestItem = {
  match: (config: RequestConfig) => boolean
  handler: CustomRequestHandler
}

interface TealinaVdocWebConfig {
  /**
   * Custom script tags to inject after configuration.
   * Can be used to initialize CustomRequests.
   * @example
   * ```js
   * function customUpload() {
   *   // Upload implementation
   * }
   *
   * window.TEALINA_VDOC_CONFIG.customRequests = [
   *   {
   *     match: (config) => config.url.includes('/upload'),
   *     handler: customUpload,
   *   }
   * ]
   * ```
   */
  customScripts?: string[]

  /** Custom request handlers for specific endpoints */
  customRequests?: CustomRequestItem[]

  sources: {
    /** Base URL for API requests (e.g., '/api') */
    baseURL: string

    /** Display name for the source (used as select option label) */
    name?: string

    /**
     * Introduction URL for the current source.
     * Returns either plain text or markdown content.
     * Displays at the top of the menu if provided.
     */
    introduceURL?: string

    /** Endpoint path for fetching the api.json specification */
    jsonURL: string
  }[]

  /** Document title (default: "API Document") */
  title?: string

  /**
   * Key for error messages that will be displayed
   * (supports line breaks in error formatting)
   */
  errorMessageKey?: string

  features?: {
    /** Playground feature configuration */
    playground?: {
      /**
       * Common fields for request payloads (e.g., Authorization headers).
       * Creates a reusable form for matching payloads.
       * @example
       * ```ts
       * const config = {
       *   commonFields: {
       *     headers: { Authorization: 'string' }
       *   }
       * }
       * ```
       */
      commonFields?: CommonFieldsType
    }
  }
}

const getAssetsPath = () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../')
  const assetsDir = path.join(dir, 'static')
  return assetsDir
}

const genHtmlContent = async ({
  inHeadTags = [],
}: {
  inHeadTags: string[]
}) => {
  const indexPath = path.join(getAssetsPath(), 'index.html')
  const content = await readFile(indexPath).then(v => v.toString())
  const headEndIndex = content.indexOf('</head>')
  return [
    content.slice(0, headEndIndex),
    ...inHeadTags,
    content.slice(headEndIndex),
  ].join('')
}

function makeVdocConfigCode(config: TealinaVdocWebConfig) {
  return `window.TEALINA_VDOC_CONFIG=${JSON.stringify(config)}`
}

async function assembleHTML(config: TealinaVdocWebConfig) {
  const {
    title,
    customScripts = [],
    ...webConfig
  } = {
    ...config,
    title: config.title ?? 'API Document',
  }
  const configuration = `<script>${makeVdocConfigCode(webConfig)}</script>`
  const customScriptTags = customScripts
    .map(s => `<script>${s}</script>`)
    .join('\n')
  return genHtmlContent({
    inHeadTags: [`<title>${title}</title>`, configuration, customScriptTags],
  })
}

export { getAssetsPath, assembleHTML }
export type { TealinaVdocWebConfig, CommonFieldsType }
