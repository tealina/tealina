import { useState } from 'react'
import type { FormEvent } from 'react'
import { money, shortDate, stars } from '../format'
import { describeError, useShop } from '../store'
import type { CommentView, ProductView } from '../types'
import { Avatar, CloseButton, Rating, drawerArtStyle } from './ui'

const Reviews = ({
  product,
  comments,
}: {
  product: ProductView
  comments: CommentView[]
}) => {
  const { state, actions } = useShop()
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await actions.postReview(product.id, rating, text)
      setText('')
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3.5 font-display text-[1.2rem] font-600">
        Reviews{' '}
        {product.reviewCount > 0 ? (
          <span className="text-[0.9rem] font-400 text-muted">
            · {product.reviewCount}
          </span>
        ) : null}
      </h3>

      {comments.length === 0 ? (
        <p className="text-muted">No reviews yet. Be the first.</p>
      ) : (
        <ul className="grid gap-4.5">
          {comments.map(comment => (
            <li key={comment.id}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[0.86rem]">
                <Avatar small name={comment.authorName} />
                <strong>{comment.authorName}</strong>
                <span className="tracking-[0.08em] text-amber">
                  {stars(comment.rating)}
                </span>
                <span className="ml-auto text-[0.75rem] text-muted">
                  {shortDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-[0.88rem] text-ink-soft">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}

      {state.session == null ? (
        <p className="mt-5.5 border-t border-line pt-5 text-muted">
          <button
            type="button"
            className="link-button"
            onClick={() => actions.openAuth('login')}
          >
            Sign in
          </button>{' '}
          to leave a review.
        </p>
      ) : (
        <form
          className="mt-5.5 flex flex-wrap items-end gap-2.5 border-t border-line pt-5"
          onSubmit={event => void submit(event)}
        >
          <label className="label">
            Rating
            <select
              className="field"
              value={rating}
              onChange={event => setRating(Number(event.target.value))}
            >
              <option value="5">★★★★★</option>
              <option value="4">★★★★☆</option>
              <option value="3">★★★☆☆</option>
              <option value="2">★★☆☆☆</option>
              <option value="1">★☆☆☆☆</option>
            </select>
          </label>
          <label className="label min-w-40 flex-1">
            Review
            <textarea
              className="field resize-y"
              rows={2}
              required
              minLength={3}
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="What did it taste like?"
            />
          </label>
          <span className="basis-full text-[0.82rem] text-danger" role="alert">
            {error}
          </span>
          <button type="submit" className="btn-solid btn-small" disabled={busy}>
            {busy ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}
    </section>
  )
}

export const ProductDrawer = () => {
  const { state, actions } = useShop()
  const selected = state.selected
  if (selected == null) return null
  const { product, comments } = selected

  return (
    <>
      <button
        type="button"
        className="scrim cursor-default"
        aria-label="Close product"
        onClick={actions.closeProduct}
      />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
      >
        <CloseButton onClick={actions.closeProduct} />

        <div
          className="grid min-h-[230px] place-items-center"
          style={drawerArtStyle(product.accent)}
          aria-hidden="true"
        >
          <span className="text-[5rem] drop-shadow-[0_16px_22px_rgb(0_0_0/32%)]">
            {product.emoji}
          </span>
        </div>

        <div className="px-7 pt-6.5 pb-10 max-[480px]:px-5 max-[480px]:pt-5.5 max-[480px]:pb-9">
          <p className="eyebrow">{product.categoryName}</p>
          <h2 className="mt-1 font-display text-[1.9rem] font-500 leading-[1.12]">
            {product.name}
          </h2>

          <div className="my-3.5 flex flex-wrap items-center gap-3">
            <span className="price-big">{money(product.price)}</span>
            <Rating product={product} />
            <span
              className={`stock-pill ${
                product.stock === 0
                  ? 'bg-danger-soft text-danger'
                  : 'bg-green-soft text-green'
              }`}
            >
              {product.stock === 0 ? 'Sold out' : `${product.stock} in stock`}
            </span>
          </div>

          <p className="text-[0.95rem] text-ink-soft">{product.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3.5 border-y border-line py-4.5">
            <button
              type="button"
              className="btn-solid"
              disabled={product.stock === 0}
              onClick={() => void actions.addToCart(product.id)}
            >
              {product.stock === 0 ? 'Sold out' : 'Add to cart'}
            </button>
            <span className="text-[0.8rem] text-muted">
              Free shipping over $50
            </span>
          </div>

          <Reviews key={product.id} product={product} comments={comments} />
        </div>
      </aside>
    </>
  )
}
