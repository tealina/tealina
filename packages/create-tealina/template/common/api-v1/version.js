/**
 * This version's name. It is both the URL segment the routes mount under and the label
 * the documentation page shows when more than one version is mounted.
 */
export const API_VERSION = 'v1'

/**
 * The URL prefix this api package mounts its routes under.
 *
 * Read by three places that must agree: `tealina.config` hands it to `gdoc`, the mount
 * puts the router there, and the frontend builds its request urls from it.
 */
export const API_BASE_URL = `/api/${API_VERSION}`
