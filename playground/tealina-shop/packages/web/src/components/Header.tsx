import { cartCount } from '../state'
import { useShop } from '../store'
import type { View } from '../types'
import { Avatar } from './ui'

const kNavItem =
  'relative rounded-full px-3 py-1.75 text-[0.92rem] text-ink-soft hover:bg-accent-soft'
const kNavActive =
  'font-600 text-accent-dark after:absolute after:left-3 after:right-3 after:bottom-0.5 after:h-0.5 after:rounded after:bg-accent'

export const Header = () => {
  const { state, actions } = useShop()
  const user = state.session?.user

  const navItem = (view: View, label: string) => (
    <button
      type="button"
      className={`${kNavItem} ${state.view === view ? kNavActive : ''}`}
      onClick={() => actions.go(view)}
    >
      {label}
    </button>
  )

  return (
    <header className="sticky top-0 z-40 flex items-center gap-7 border-b border-line bg-[color-mix(in_srgb,var(--cream)_88%,transparent)] px-[clamp(20px,4vw,56px)] py-3.5 backdrop-blur-[14px] max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2.5 max-md:px-4.5 max-md:py-3">
      <a
        className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap no-underline"
        href="#/shop"
        aria-label="Tealina Roasters"
        onClick={event => {
          event.preventDefault()
          actions.go('shop')
        }}
      >
        <span
          className="grid place-items-center w-8.5 h-8.5 rounded-full bg-ink text-cream text-[19px] leading-none"
          aria-hidden="true"
        >
          ◐
        </span>
        <span className="font-display text-base font-600 tracking-[0.22em]">
          TEALINA{' '}
          <em className="font-400 tracking-[0.06em] text-accent not-italic">
            roasters
          </em>
        </span>
      </a>

      <nav
        className="mr-auto flex items-center gap-1.5 max-md:order-3 max-md:w-full max-md:overflow-x-auto"
        aria-label="Main"
      >
        {navItem('shop', 'Shop')}
        {navItem('orders', 'Orders')}
        {user?.role === 'ADMIN' ? navItem('admin', 'Admin') : null}
        <a
          className={`${kNavItem} inline-flex items-center gap-1 no-underline`}
          href="/api-doc/index.html"
          target="_blank"
          rel="noreferrer"
        >
          API Docs <span className="text-[0.75em] opacity-70">↗</span>
        </a>
      </nav>

      <div className="flex items-center gap-3 max-md:ml-auto">
        <button
          type="button"
          className="inline-flex items-center gap-1.75 rounded-full border border-line-strong bg-paper px-3.5 py-2 text-[0.9rem] hover:border-accent"
          onClick={actions.openCart}
          aria-label="Open cart"
        >
          <span className="text-[1.1rem] text-accent" aria-hidden="true">
            ◒
          </span>
          <span className="max-md:hidden">Cart</span>
          {cartCount(state.cart) > 0 ? (
            <span className="grid h-5.25 min-w-5.25 place-items-center rounded-full bg-accent px-1.5 text-[0.73rem] font-700 text-white">
              {cartCount(state.cart)}
            </span>
          ) : null}
        </button>

        {user == null ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => actions.openAuth('login')}
          >
            Sign in
          </button>
        ) : (
          <span className="inline-flex items-center gap-2.25 text-[0.9rem]">
            <Avatar name={user.name} />
            <span className="max-w-[12ch] overflow-hidden text-ellipsis whitespace-nowrap max-md:hidden">
              {user.name}
            </span>
            <button
              type="button"
              className="link-button"
              onClick={actions.logout}
            >
              Sign out
            </button>
          </span>
        )}
      </div>
    </header>
  )
}
