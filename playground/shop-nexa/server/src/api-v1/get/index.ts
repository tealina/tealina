//prettier-ignore
export default {
  'health': import('./health.js'),
  'user/:id/': import('./user/[id].js'),
}
