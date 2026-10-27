import type { AuthedHandler } from 'core/handler'
import { authedApi } from 'core/access'
import { addComment, type CommentView } from 'core/services'
import type { WithStatusCode } from 'tealina/utility-types'

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
  res.status(201).send(addComment(res.locals, req.params.id, req.body))
}

export default authedApi(handler)
