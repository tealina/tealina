import { useState } from 'react'
import { money } from '../format'
import { cartCount, cartTotal } from '../state'
import { useShop } from '../store'
import type { CartItem } from '../types'
import { CloseButton, EmptyPanel, MiniArt } from './ui'

const CartLine = ({ item }: { item: CartItem }) => {
  const { actions } = useShop()
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-line pb-3.5">
      <MiniArt accent={item.accent}>{item.emoji}</MiniArt>
      <span className="flex min-w-0 flex-col">
        <strong className="text-[0.92rem]">{item.name}</strong>
        <span className="text-[0.76rem] text-muted">
          {money(item.price)} each
        </span>
      </span>
      <span className="font-mono text-[0.92rem] whitespace-nowrap">
        {money(item.price * item.quantity)}
      </span>

      <span className="col-start-2 inline-flex w-fit items-center gap-0.5 overflow-hidden rounded-full border border-line-strong">
        <button
          type="button"
          className="h-6.5 w-7 text-[0.9rem] hover:bg-accent-soft"
          onClick={() => actions.changeQuantity(item.productId, -1)}
          aria-label="One fewer"
        >
          −
        </button>
        <span className="min-w-6 text-center font-mono text-[0.8rem]">
          {item.quantity}
        </span>
        <button
          type="button"
          className="h-6.5 w-7 text-[0.9rem] hover:bg-accent-soft"
          onClick={() => actions.changeQuantity(item.productId, 1)}
          aria-label="One more"
        >
          +
        </button>
      </span>

      <button
        type="button"
        className="col-start-2 justify-self-start text-[0.74rem] text-muted underline decoration-line-strong underline-offset-3 hover:text-danger"
        onClick={() => actions.removeFromCart(item.productId)}
      >
        Remove
      </button>
    </li>
  )
}

export const CartDrawer = () => {
  const { state, actions } = useShop()
  const [note, setNote] = useState('')
  if (!state.ui.cartOpen) return null

  const count = cartCount(state.cart)
  const total = cartTotal(state.cart)

  const placeOrder = async () => {
    if (await actions.checkout(note)) setNote('')
  }

  return (
    <>
      <button
        type="button"
        className="scrim cursor-default"
        aria-label="Close cart"
        onClick={actions.closeCart}
      />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
      >
        <CloseButton onClick={actions.closeCart} />
        <div className="px-7 pt-6.5 pb-10 max-[480px]:px-5 max-[480px]:pt-5.5 max-[480px]:pb-9">
          <p className="eyebrow">Your cart</p>
          <h2 className="font-display text-[1.9rem] font-500 leading-[1.12]">
            {count} {count === 1 ? 'item' : 'items'}
          </h2>

          {state.cart.length === 0 ? (
            <div className="mt-5.5">
              <EmptyPanel
                title="Nothing here yet."
                action={
                  <button
                    type="button"
                    className="btn-solid"
                    onClick={() => {
                      actions.closeCart()
                      actions.go('shop')
                    }}
                  >
                    Browse the shelf
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <ul className="my-4.5 grid gap-3.5">
                {state.cart.map(item => (
                  <CartLine key={item.productId} item={item} />
                ))}
              </ul>

              <label className="label mb-4.5">
                Note for the roastery
                <input
                  className="field"
                  type="text"
                  maxLength={160}
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder="Grind half for a moka pot…"
                />
              </label>

              <div className="flex items-baseline justify-between border-t border-line-strong py-3.5 font-display text-[1.15rem]">
                <span>Subtotal</span>
                <strong className="text-[1.5rem]">{money(total)}</strong>
              </div>
              <p className="text-[0.83rem] text-muted">
                Shipping is free over $50. This demo does not take payment.
              </p>

              <button
                type="button"
                className="btn-solid btn-wide mt-3.5"
                disabled={state.ui.busy}
                onClick={() => void placeOrder()}
              >
                {state.ui.busy
                  ? 'Placing order…'
                  : state.session == null
                    ? 'Sign in to check out'
                    : 'Place order'}
              </button>
              {state.session == null ? (
                <p className="mt-2 text-center text-[0.83rem] text-muted">
                  You will be asked to sign in first.
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
