export const JSON_URL = 'http://localhost:5000/api-doc/v1.json'
export const VDOC_CONFIG = {
  sources: [
    {
      baseURL: '/api/v1',
      jsonURL: JSON_URL,
      name: '/api/v1',
    },
  ],
  errorMessageKey: 'message',
  features: {
    playground: {
      commonFields: {
        headers: {
          Authorization: 'string',
        },
        body: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 },
        },
      },
    },
  },
}
