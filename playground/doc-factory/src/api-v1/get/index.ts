export default {
  '/health': import('./health.js'),
  '/stream/fileDownload': import('./stream/fileDownload.js'),
  '/stream/json': import('./stream/json.js'),
  '/stream/logs': import('./stream/logs.js'),
  '/stream/sse': import('./stream/sse.js'),
}
