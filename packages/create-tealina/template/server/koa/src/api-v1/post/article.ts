import type { AuthedHandler } from '../../../types/handler.js'
import { convention } from '../../convention.js'

/**
 * Use the 'interface' keyword to declare types
 * to ensure the type name is preserved in the API documentation.
 */
interface ArticlePayload {
  /** This JSDoc comment will appear in the documentation */
  title: string
  content: string
}

type ApiType = AuthedHandler<{ body: ArticlePayload }, { id: number }>

/**
 *  Create an article. Login required.
 */
const handler: ApiType = async ctx => {
  const { body } = ctx.request
  console.log(body.title)
  ctx.body = { id: 1 }
}

export default convention(handler)
