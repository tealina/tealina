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

interface TealinaVdocWebConfig {
  /** The cnd url to load third part libs,like: monaco-editor, react-markdown */
  cdnUrl?:string,
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
  const { title, ...webConfig } = {
    ...config,
    title: config.title ?? 'API Document',
  }
  const configuration = `<script>${makeVdocConfigCode(webConfig)}</script>`
  return genHtmlContent({
    inHeadTags: [`<title>${title}</title>`, configuration],
  })
}

export { getAssetsPath, assembleHTML }
export type { TealinaVdocWebConfig, CommonFieldsType }
