// @ts-check
import { makeTestHelperTemplate } from 'tealina'

export default makeTestHelperTemplate(
  ({ typesDirName, apiDirName, relative2ancestor }) =>
    [
      `import axios, { AxiosError } from 'axios'`,
      `import type { ApiTypesRecord } from '../${relative2ancestor}/${typesDirName}/${apiDirName}.js'`,
      `import { createReq } from '../createReq.js'`,
      `import { setupTestApp } from '../setupTestApp.js'`,
      '',
      'const serverAddr = await setupTestApp()',
      '',
      'const instance = axios.create({',
      //prettier-ignore
      `  baseURL: [serverAddr, '/${apiDirName.replace( /-/g, '/')}/'].join(''),`,
      `  headers: { Authorization: 'mock token' },`,
      `  proxy: false `,
      '})',
      '',
      'instance.interceptors.response.use(',
      '  x => x,',
      '  (error: AxiosError) => {',
      '    console.log(error.response?.data ?? String(error))',
      '  },',
      ')',
      'const req = createReq<ApiTypesRecord>(instance)',
      '',
      'export { req }',
      '',
    ].join('\n'),
)
