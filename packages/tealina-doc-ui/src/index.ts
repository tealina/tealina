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
    /** The json or text result*/
    result: string
    /** When it's true, the result will be render in red color */
    isError: boolean
  }) => void,
) => Promise<unknown>

type CustomRequestItem = {
  match: (config: RequestConfig) => boolean
  handler: CustomRequestHandler
}

interface TealinaVdocWebConfig {
  /**
   * Custom script tags to inject before configuration.
   * Can be used to initialize TEALINA_VDOC_CUSTOM_REQUESTS.
   * @example
   * ["./customUpload.js"]
   *
   * ```js
   * // customUpload.js content
   * function customUpload(payload,setResult) {
   *   // Upload implementation
   * }
   * window.TEALINA_VDOC_CUSTOM_REQUESTS = [
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
  /**
   * Security access control configuration\
   * Sets up password protection to restrict unauthorized access
   */
  security?: {
    /**
     * Login authentication API endpoint\
     * Called when user submits password for initial authentication\
     * The API should return authentication results based on authenticationWay:\
     * - 'session': Empty response with status code 200 (session will be managed automatically)
     * - 'headers': JSON data containing headers to be injected into api.json requests\
     * fmt: POST application/json { password: 'xx' }
     */
    loginURL: string

    /**
     * Authentication method\
     * - 'session': Uses session-based authentication, establishes a session upon successful validation
     * - 'headers': Uses header-based authentication, injects validation results into headers
     *   when requesting the api.json file (not for every request)
     */
    authenticationWay: 'session' | 'headers'

    /**
     * Logout callback URL (optional)\
     * Called when user closes the page or logs out to revoke authorization\
     * Only applicable when authenticationWay is 'session'\
     * [POST]
     */
    logoutURL?: string
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
    .map(url => `<script src="${url}"></script>`)
    .join('\n')
  return genHtmlContent({
    inHeadTags: [`<title>${title}</title>`, customScriptTags, configuration],
  })
}

export { getAssetsPath, assembleHTML }
export type { TealinaVdocWebConfig, CommonFieldsType }
