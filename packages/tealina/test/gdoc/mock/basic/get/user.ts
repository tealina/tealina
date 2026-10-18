import { ApiHandler, MakeExampleType } from '../../apiUtility.js'

interface RestfulInputType {
  /**
   * paylod commment
   */
  query: {
    page: number
  }
}

type ApiType = ApiHandler<RestfulInputType>
const handler: ApiType = (_req, _res, _next) => {}

export default handler

export const examples: MakeExampleType<ApiType> = {
  query: { page: 1 },
}
