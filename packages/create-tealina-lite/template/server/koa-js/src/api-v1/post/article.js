import { convention } from '../../convention.js'

/**
 * Declare types with `@typedef` rather than inline in the handler's type: like the
 * `interface` keyword in the TypeScript tree, it keeps the type *name* in the API
 * documentation.
 *
 * @typedef {object} ArticlePayload
 * @property {string} title - This JSDoc comment will appear in the documentation
 * @property {string} content
 */

/**
 *  Create an article. Login required.
 * @type {Tealina.Authed<{ body: ArticlePayload }, { id: number }>}
 */
const handler = async ctx => {
  const { body } = ctx.request
  console.log(body.title)
  ctx.body = { id: 1 }
}

export default convention(handler)
