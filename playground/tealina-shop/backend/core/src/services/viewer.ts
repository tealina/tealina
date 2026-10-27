import type { AuthedLocals } from '../../types/common.js'
import { HttpError } from './errors.js'

/** Who is asking, in the shape the store works with. */
export type Viewer = {
  userId: number
  isAdmin: boolean
}

export const viewerOf = (locals: AuthedLocals): Viewer => ({
  userId: Number(locals.userId),
  isAdmin: locals.role === 'ADMIN',
})

export const requireAdmin = (viewer: Viewer) => {
  if (!viewer.isAdmin) {
    throw new HttpError(403, 'FORBIDDEN', 'This endpoint is for admins only.')
  }
}
