import { useEffect, useState } from 'react'
import { money } from '../format'
import { useShop } from '../store'
import type { ProductView, Sort } from '../types'
import { Rating, SkeletonGrid, artStyle } from './ui'

const kSortOptions: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'rating', label: 'Best rated' },
]

const Hero = () => {
  return (
    <section className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] items-center gap-[clamp(24px,5vw,72px)] px-[clamp(20px,4vw,56px)] pt-[clamp(40px,7vw,92px)] pb-[clamp(36px,5vw,64px)] max-[760px]:grid-cols-1">
      <div>
        <p className="eyebrow">Roasted every Monday · Shipped the same week</p>
        <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.6rem)] font-500 leading-[0.98] tracking-[-0.02em]">
          Coffee worth
          <br />
          slowing down for.
        </h1>
        <p className="mt-5 max-w-[46ch] text-[1.02rem] text-ink-soft">
          Single-origin beans and the tools that do them justice. This is a demo
          storefront running on <strong>tealina</strong>: every price, order and
          review below crosses a typed API.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            className="btn-solid no-underline"
            href="#catalog"
            onClick={event => {
              event.preventDefault()
              document
                .querySelector('#catalog')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Browse the shelf
          </a>
          <a
            className="btn-ghost no-underline"
            href="/api-doc/index.html"
            target="_blank"
            rel="noreferrer"
          >
            Open the API docs
          </a>
        </div>
        <dl className="mt-10.5 flex flex-wrap gap-7 border-t border-line pt-5.5 max-[760px]:gap-4.5">
          <div>
            <dt className="text-[0.7rem] tracking-[0.14em] text-muted uppercase">
              Free shipping
            </dt>
            <dd className="mt-0.75 font-display text-[1.02rem]">over $50</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] tracking-[0.14em] text-muted uppercase">
              Roast date
            </dt>
            <dd className="mt-0.75 font-display text-[1.02rem]">
              printed on the bag
            </dd>
          </div>
          <div>
            <dt className="text-[0.7rem] tracking-[0.14em] text-muted uppercase">
              Demo login
            </dt>
            <dd className="mt-0.75 font-display text-[1.02rem]">
              mia@example.com
            </dd>
          </div>
        </dl>
      </div>

      <div
        className="relative grid aspect-square w-full max-w-[420px] place-items-center justify-self-end max-[760px]:order-first max-[760px]:mx-auto max-[760px]:mb-2 max-[760px]:max-w-[260px] max-[760px]:justify-self-center"
        aria-hidden="true"
      >
        <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle_at_32%_28%,#d9a06f_0%,#b4552d_46%,#6f2c14_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/12%),var(--shadow)]">
          <div className="absolute inset-[12%] rounded-full border border-dashed border-[rgb(255_248_238/38%)]" />
        </div>
        <span className="relative text-[clamp(5rem,12vw,8.5rem)] drop-shadow-[0_14px_20px_rgb(60_24_8/45%)]">
          ☕
        </span>
        <span className="absolute right-[2%] bottom-[10%] grid w-19.5 h-19.5 rotate-[9deg] place-items-center rounded-full border border-line-strong bg-cream text-center font-display text-[0.78rem] tracking-[0.12em]">
          EST.
          <br />
          2026
        </span>
      </div>
    </section>
  )
}

const CategoryChips = () => {
  const { state, actions } = useShop()
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter by category"
    >
      <button
        type="button"
        className={
          state.query.categoryId === undefined ? 'chip-active' : 'chip'
        }
        onClick={() => actions.setCategory(undefined)}
      >
        Everything
      </button>
      {state.categories.map(category => (
        <button
          key={category.id}
          type="button"
          className={
            state.query.categoryId === category.id ? 'chip-active' : 'chip'
          }
          onClick={() => actions.setCategory(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}

const SearchForm = () => {
  const { state, actions } = useShop()
  const [keyword, setKeyword] = useState(state.query.keyword)

  useEffect(() => {
    setKeyword(state.query.keyword)
  }, [state.query.keyword])

  return (
    <form
      className="flex gap-2 max-[760px]:w-full"
      role="search"
      onSubmit={event => {
        event.preventDefault()
        actions.search(keyword)
      }}
    >
      <input
        type="search"
        name="keyword"
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
        placeholder="Search the shelf…"
        aria-label="Search products"
        className="w-[min(300px,56vw)] rounded-full border border-line-strong bg-paper px-4 py-2.5 focus:border-accent focus:outline-none max-[760px]:w-auto max-[760px]:flex-1"
      />
      <button type="submit" className="btn-solid btn-small">
        Search
      </button>
    </form>
  )
}

const ProductCard = ({ product }: { product: ProductView }) => {
  const { actions } = useShop()
  const soldOut = product.stock === 0
  const low = !soldOut && product.stock <= 10

  return (
    <article className="product-card group">
      <button
        type="button"
        className="product-art"
        style={artStyle(product.accent)}
        onClick={() => void actions.openProduct(product.id)}
        aria-label={`View ${product.name}`}
      >
        <span
          className="text-[clamp(2.6rem,5vw,3.6rem)] drop-shadow-[0_8px_12px_rgb(0_0_0/28%)] transition-transform duration-220 group-hover:scale-[1.08] group-hover:-rotate-[4deg]"
          aria-hidden="true"
        >
          {product.emoji}
        </span>
        {soldOut ? (
          <span className="badge">Sold out</span>
        ) : low ? (
          <span className="badge-low">Only {product.stock} left</span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-2 px-4.5 pt-4 pb-4.5 max-[760px]:px-3.5 max-[760px]:pt-3.25 max-[760px]:pb-3.75">
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-[0.68rem] tracking-[0.13em] text-muted uppercase">
            {product.categoryName}
          </span>
          <Rating product={product} />
        </div>

        <h3 className="font-display text-[1.06rem] font-600 leading-tight">
          <button
            type="button"
            className="p-0 text-left hover:text-accent-dark"
            onClick={() => void actions.openProduct(product.id)}
          >
            {product.name}
          </button>
        </h3>

        <p className="line-clamp-2 text-[0.82rem] leading-normal text-muted">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2.5 pt-2.5 max-[760px]:flex-wrap">
          <span className="price">{money(product.price)}</span>
          <button
            type="button"
            className="btn-solid btn-small"
            disabled={soldOut}
            onClick={() => void actions.addToCart(product.id)}
          >
            {soldOut ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  )
}

const Catalog = () => {
  const { state, actions } = useShop()
  const list = state.catalog

  if (state.catalogLoading && list == null) return <SkeletonGrid />

  if (list == null || list.items.length === 0) {
    return (
      <div className="empty-panel">
        <p className="mb-1.5 font-display text-[1.2rem]">
          Nothing on this shelf yet.
        </p>
        <p>Try another category or clear the search.</p>
        <button
          type="button"
          className="btn-ghost mt-4"
          onClick={actions.clearFilters}
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="my-4.5 flex items-center justify-between gap-4">
        <p className="text-[0.85rem] text-muted">
          {list.total} {list.total === 1 ? 'product' : 'products'}
        </p>
        <div className="inline-flex items-center gap-3 text-[0.84rem] text-muted">
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.25 text-ink hover:bg-accent-soft disabled:opacity-50"
            disabled={list.page <= 1}
            onClick={() => actions.setPage(list.page - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {list.page} of {list.totalPages}
          </span>
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.25 text-ink hover:bg-accent-soft disabled:opacity-50"
            disabled={list.page >= list.totalPages}
            onClick={() => actions.setPage(list.page + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-[clamp(16px,2.4vw,28px)] max-[980px]:grid-cols-3 max-[760px]:grid-cols-2 max-[480px]:grid-cols-1">
        {list.items.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  )
}

export const ShopView = () => {
  const { state, actions } = useShop()

  return (
    <>
      <Hero />
      <section
        id="catalog"
        className="mx-auto max-w-[1180px] border-t border-line px-[clamp(20px,4vw,56px)] pt-[clamp(28px,4vw,48px)] pb-18"
      >
        <div className="flex flex-wrap items-end justify-between gap-5 max-[760px]:items-stretch">
          <div>
            <h2 className="font-display text-[clamp(1.8rem,3vw,2.4rem)] font-500 tracking-[-0.01em]">
              The shelf
            </h2>
            <p className="section-sub">
              Beans, brewers and the small things in between.
            </p>
          </div>
          <SearchForm />
        </div>

        <div className="mt-6.5 mb-1.5 flex flex-wrap items-center justify-between gap-4">
          <CategoryChips />
          <label className="inline-flex items-center gap-2.25 text-[0.85rem] text-muted">
            <span>Sort</span>
            <select
              name="sort"
              value={state.query.sort}
              onChange={event => actions.setSort(event.target.value as Sort)}
              className="rounded-full border border-line-strong bg-paper px-3 py-2"
            >
              {kSortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Catalog />
      </section>
    </>
  )
}
