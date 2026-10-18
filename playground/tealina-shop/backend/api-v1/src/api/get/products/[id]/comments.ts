import type { OpenHandler } from 'core/handler'
import { openApi } from 'core/access'
import type { CommentView } from '../../../../model.js'
import { parseId } from '../../../../http.js'
import { listComments } from '../../../../store/index.js'

type ApiType = OpenHandler<{ params: { id: string } }, CommentView[]>

/**
 * Reviews for one product, newest first.
 */
const handler: ApiType = async (req, res) => {
  res.send(listComments(parseId(req.params.id)))
}

export default openApi(handler)
