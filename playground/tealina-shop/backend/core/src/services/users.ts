import type { AuthedLocals } from '../../types/common.js'
import type { Pure } from '../../types/pure.js'
import { issueToken } from '../auth/token.js'
import { HttpError } from './errors.js'
import type { LoginResult, PublicUser } from './model.js'
import { now, publicUser, pushActivity, takeUserId, users } from './store.js'

const findUserByEmail = (email: string) =>
  users.find(user => user.email.toLowerCase() === email.trim().toLowerCase())

const findUserById = (id: number) => users.find(user => user.id === id)

const signIn = (user: Pure.User): LoginResult => ({
  token: issueToken({ sub: String(user.id), role: user.role }),
  user: publicUser(user),
})

export const login = (input: {
  email: string
  password: string
}): LoginResult => {
  const user = findUserByEmail(input.email)
  if (user == null || user.password !== input.password) {
    throw new HttpError(
      401,
      'UNAUTHORIZED',
      'That email and password do not match an account.',
    )
  }
  return signIn(user)
}

export const register = (input: {
  name: string
  email: string
  password: string
}): LoginResult => {
  const name = input.name.trim()
  const email = input.email.trim()
  if (name.length < 2) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Name needs at least 2 characters.',
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'That email address is not valid.',
    )
  }
  if (input.password.length < 6) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Password needs at least 6 characters.',
    )
  }
  if (findUserByEmail(email) != null) {
    throw new HttpError(
      409,
      'CONFLICT',
      'An account with that email already exists.',
    )
  }
  const user: Pure.User = {
    id: takeUserId(),
    name,
    email,
    password: input.password,
    role: 'CUSTOMER',
    createdAt: now(),
  }
  users.push(user)
  pushActivity('comment', `${user.name} joined the store`)
  return signIn(user)
}

export const getMe = (locals: AuthedLocals): PublicUser => {
  const user = findUserById(Number(locals.userId))
  if (user == null) {
    throw new HttpError(
      401,
      'UNAUTHORIZED',
      'The account behind this token no longer exists.',
    )
  }
  return publicUser(user)
}
