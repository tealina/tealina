/**
 * The URL prefix this api package mounts its routes under.
 *
 * Read by three places that must agree: `tealina.config` hands it to `gdoc`, the mount
 * puts the router there, and the frontend builds its request urls from it.
 */
export const API_BASE_URL = '/api/v1'

/**
 * Where the documentation page and its json are served. The page is not part of the API
 * contract, so it has a prefix of its own rather than living under `API_BASE_URL`.
 */
export const VDOC_BASENAME = '/api-doc'
