import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import type { WithStatusCode } from 'tealina/utility-types'
import type { CommentView } from '../../../../model.js'
import { parseId } from '../../../../http.js'
import { addComment } from '../../../../store/index.js'

export interface CommentPayload {
  /** 1 to 5 stars. */
  rating: number
  /** What the coffee (or the mug) was actually like. */
  text: string
}

type ApiType = AuthedHandler<
  { params: { id: string }; body: CommentPayload },
  WithStatusCode<201, CommentView>
>

/**
 * Post a review. Sign in first; the author is taken from the token, not the body.
 */
const handler: ApiType = async (req, res) => {
  const productId = parseId(req.params.id)
  const comment = addComment(productId, Number(res.locals.userId), req.body)
  res.status(201).send(comment)
}

export default authedApi(handler)
