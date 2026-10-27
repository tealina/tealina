import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import { listComments, type CommentView } from 'core/services'

type ApiType = OpenHandler<{ params: { id: string } }, CommentView[]>

/**
 * Reviews for one product, newest first.
 */
const handler: ApiType = async (req, res) => {
  res.send(listComments(req.params.id))
}

export default openApi(handler)
