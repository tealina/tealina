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
  /** The cnd url to load third part libs,like: monaco-editor, react-markdown */
  cdnUrl?: string
  /**
   * inject custom scripts tag, the tag will be placement after configuration
   * you can use it to initialize  CustomRequests
   * @example
   * ```js
   *
   *  funtion customUpload(){
   *  }
   *
   *  window.TEALINA_VDOC_CONFIG.customRequests=[
   *    {
   *      match: (config) => config.url.includes('/upload'),
   *      handler: customUpload,
   *    }
   *  ]
   * ```
   */
  customScripts?: string[]
  /**
   * custom matched request
   */
  customRequests?: CustomRequestItem[]
  sources: {
    /** eg:'/api' */
    baseURL: string
    /** Will be the select option label */
    name?: string
    /** The endpoint path for fetch the api.json */
    jsonURL: string
  }[]

  /**
   * @default "API Document"
   */
  title?: string
  /**
   * when error, show reason by this key, format line break
   */
  errorMessageKey?: string
  features?: {
    /**
     * Enable the Playground section
     */
    playground?: {
      /**
       *  Common Fields in request payload,\
       *  such like `Authorization` in headers.\
       *  Document Page will create a Form by it,\
       *  so you can setup and reuse when the payload is match the fields.
       * @example
       * ```ts
       * const config = { commonFields: { headers: { Authorization: 'string'}}}
       * ```
       *  */
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
