// @ts-check
import { makeTestSuiteTemplate } from 'tealina'

export default makeTestSuiteTemplate(({ method, route, relative2ancestor }) =>
  [].join('\n'),
)
