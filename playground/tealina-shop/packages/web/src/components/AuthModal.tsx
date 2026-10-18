import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { describeError, useShop } from '../store'
import { CloseButton } from './ui'

const kDemoAccounts = [
  { role: 'Customer', email: 'mia@example.com', password: 'demo123' },
  { role: 'Admin', email: 'admin@tealina.dev', password: 'admin123' },
]

export const AuthModal = () => {
  const { state, actions } = useShop()
  const mode = state.ui.authMode
  const isLogin = mode === 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName('')
    setEmail('')
    setPassword('')
    setError('')
  }, [mode])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await actions.authenticate(mode, { name, email, password })
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="scrim-modal cursor-default"
        aria-label="Close sign in"
        onClick={actions.closeAuth}
      />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isLogin ? 'Sign in' : 'Create account'}
      >
        <CloseButton onClick={actions.closeAuth} />
        <div>
          <p className="eyebrow">Tealina Roasters</p>
          <h2 className="mt-0.5 font-display text-[1.8rem] font-500">
            {isLogin ? 'Welcome back' : 'Join the club'}
          </h2>
          <p className="mt-1.5 text-[0.88rem] text-muted">
            {isLogin
              ? 'Sign in to check out, review a coffee and see your orders.'
              : 'One account for orders and reviews.'}
          </p>
        </div>

        <div className="my-4.5 flex gap-1 rounded-full bg-cream p-1">
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-2 text-[0.86rem] ${
              isLogin
                ? 'bg-paper font-600 text-ink shadow-[0_2px_8px_rgb(0_0_0/8%)]'
                : 'text-muted'
            }`}
            onClick={() => actions.setAuthMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full px-3 py-2 text-[0.86rem] ${
              isLogin
                ? 'text-muted'
                : 'bg-paper font-600 text-ink shadow-[0_2px_8px_rgb(0_0_0/8%)]'
            }`}
            onClick={() => actions.setAuthMode('register')}
          >
            Create account
          </button>
        </div>

        <form className="grid gap-3.25" onSubmit={event => void submit(event)}>
          {isLogin ? null : (
            <label className="label">
              Name
              <input
                className="field"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </label>
          )}
          <label className="label">
            Email
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="mia@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label className="label">
            Password
            <input
              className="field"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          <span className="text-[0.82rem] text-danger" role="alert">
            {error}
          </span>
          <button
            type="submit"
            className="btn-solid btn-wide mt-1"
            disabled={busy}
          >
            {busy ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {isLogin ? (
          <div className="mt-5.5 grid gap-2 border-t border-line pt-4.5">
            <p className="eyebrow mb-0.5">Demo accounts</p>
            {kDemoAccounts.map(account => (
              <button
                key={account.email}
                type="button"
                className="flex items-center justify-between gap-3 rounded-[10px] border border-dashed border-line-strong px-3.25 py-2.5 text-left text-[0.8rem] hover:border-accent hover:bg-accent-soft"
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError('')
                }}
              >
                <strong>{account.role}</strong>
                <span className="font-mono text-[0.72rem] text-muted">
                  {account.email} · {account.password}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
