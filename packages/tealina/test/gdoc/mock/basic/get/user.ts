import { ApiHandler } from '../../apiUtility.js'

interface RestfulInputType {
  /**
   * paylod commment
   */
  query: {
    page: number
  }
}

const handler: ApiHandler<RestfulInputType> = (req, res, next) => {}

export default handler
