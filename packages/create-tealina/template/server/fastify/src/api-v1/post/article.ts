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
const handler: ApiType = async (request, reply) => {
  const { body } = request
  console.log(body.title)
  reply.send({ id: 1 })
}

export default convention(handler)
