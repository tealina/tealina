import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { money } from '../format'
import { describeError, useShop } from '../store'
import type {
  ActivityEvent,
  CreateProductBody,
  OrderStatus,
  ProductView,
} from '../types'
import { EmptyPanel, MiniArt, StatusBadge } from './ui'

const kStatusOrder: OrderStatus[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const kActivityIcon: Record<ActivityEvent['type'], string> = {
  order: '🧾',
  stock: '📦',
  comment: '★',
}

const Page = ({ children }: { children: ReactNode }) => (
  <section className="mx-auto min-h-[62vh] max-w-[1180px] px-[clamp(20px,4vw,56px)] pt-[clamp(32px,5vw,64px)] pb-20">
    {children}
  </section>
)

const StatTile = ({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) => (
  <div className="rounded-[11px] border border-line bg-paper px-5 py-4.5">
    <p className="text-[0.7rem] tracking-[0.13em] text-muted uppercase">
      {label}
    </p>
    <p className="mt-1.5 mb-0.5 font-display text-[1.85rem] font-600">
      {value}
    </p>
    <p className="text-[0.78rem] text-muted">{hint}</p>
  </div>
)

const AdminProductRow = ({ product }: { product: ProductView }) => {
  const { actions } = useShop()
  const [stock, setStock] = useState(String(product.stock))

  useEffect(() => {
    setStock(String(product.stock))
  }, [product.stock])

  return (
    <tr>
      <td className="border-b border-line px-2.5 py-2.5 align-middle">
        <MiniArt accent={product.accent}>{product.emoji}</MiniArt>
      </td>
      <td className="border-b border-line px-2.5 py-2.5 align-middle">
        <strong>{product.name}</strong>
        <span className="block text-muted">
          {product.categoryName} · {money(product.price)}
        </span>
      </td>
      <td className="whitespace-nowrap border-b border-line px-2.5 py-2.5 align-middle">
        <input
          className="mr-1.5 w-18.5 rounded-lg border border-line-strong bg-cream px-2.25 py-1.5"
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={event => setStock(event.target.value)}
        />
        <button
          type="button"
          className="btn-solid btn-small"
          onClick={() =>
            void actions.saveStock(
              product.id,
              stock.trim() === '' ? Number.NaN : Number(stock),
            )
          }
        >
          Save
        </button>
      </td>
      <td className="border-b border-line px-2.5 py-2.5 text-right align-middle">
        <button
          type="button"
          className="link-danger"
          onClick={() => void actions.deleteProduct(product.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

const ProductForm = () => {
  const { state, actions } = useShop()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const text = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value : ''
    }
    const body: CreateProductBody = {
      name: text('name').trim(),
      slug: '',
      description: text('description').trim(),
      price: Number(text('price')),
      stock: Number(text('stock')),
      emoji: text('emoji').trim() || '☕',
      accent: text('accent') || '#b4552d',
      categoryId: Number(text('categoryId')),
    }
    setBusy(true)
    setError('')
    try {
      await actions.createProduct(body)
      form.reset()
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <h2 className="font-display text-[1.35rem] font-500 tracking-[-0.01em]">
        Add a product
      </h2>
      <p className="text-muted">
        Posts to{' '}
        <code className="rounded bg-accent-soft px-1 py-0.5 font-mono text-[0.86em]">
          POST /products
        </code>{' '}
        with a body generated from the Prisma schema.
      </p>
      <form
        className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3.5 max-[980px]:grid-cols-2 max-[760px]:grid-cols-1"
        onSubmit={event => void submit(event)}
      >
        <label className="label">
          Name
          <input
            className="field"
            name="name"
            required
            minLength={2}
            placeholder="Rwanda Nyamasheke"
          />
        </label>
        <label className="label">
          Category
          <select className="field" name="categoryId" required>
            {state.categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Price
          <input
            className="field"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="19.00"
          />
        </label>
        <label className="label">
          Stock
          <input
            className="field"
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            placeholder="24"
          />
        </label>
        <label className="label">
          Emoji
          <input
            className="field"
            name="emoji"
            maxLength={4}
            placeholder="🍑"
          />
        </label>
        <label className="label">
          Accent
          <input
            className="field h-10.75 px-1 py-1"
            name="accent"
            type="color"
            defaultValue="#b4552d"
          />
        </label>
        <label className="label col-span-full">
          Description
          <textarea
            className="field resize-y"
            name="description"
            rows={2}
            required
            placeholder="Peach and black tea, roasted medium-light."
          />
        </label>
        <div className="col-span-full flex items-center justify-end gap-3.5">
          <span className="text-[0.82rem] text-danger" role="alert">
            {error}
          </span>
          <button type="submit" className="btn-solid" disabled={busy}>
            {busy ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </form>
    </section>
  )
}

export const AdminView = () => {
  const { state, actions } = useShop()

  if (state.session == null || state.session.user.role !== 'ADMIN') {
    return (
      <Page>
        <EmptyPanel tall title="The back office is admin-only.">
          <p>Sign in with the admin account to see it.</p>
        </EmptyPanel>
      </Page>
    )
  }

  const stats = state.stats
  const products = state.adminProducts
  if (stats == null) {
    return (
      <Page>
        <div className="skeleton-tall" aria-label="Loading the back office" />
      </Page>
    )
  }

  return (
    <Page>
      <div className="mb-6.5 flex flex-wrap items-end justify-between gap-4.5">
        <div>
          <p className="eyebrow">Back office</p>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-500 tracking-[-0.01em]">
            Today at the roastery
          </h1>
          <p className="section-sub">
            All of it reads from the same typed endpoints the storefront uses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void actions.exportOrders()}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void actions.refreshAdmin()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-[980px]:grid-cols-2 max-[480px]:grid-cols-1">
        <StatTile
          label="Revenue"
          value={money(stats.revenue)}
          hint="excluding cancelled orders"
        />
        <StatTile
          label="Orders"
          value={String(stats.orderCount)}
          hint={`${stats.ordersByStatus.PENDING} awaiting payment`}
        />
        <StatTile
          label="Customers"
          value={String(stats.customerCount)}
          hint="registered accounts"
        />
        <StatTile
          label="Products"
          value={String(stats.productCount)}
          hint={`${stats.lowStock.length} low on stock`}
        />
      </div>

      <div className="my-4.5 grid grid-cols-2 gap-4.5 max-[760px]:grid-cols-1">
        <section className="panel">
          <h2 className="font-display text-[1.35rem] font-500 tracking-[-0.01em]">
            Fulfilment
          </h2>
          <div className="mt-3.5 grid gap-2.5">
            {kStatusOrder
              .filter(status => status !== 'CANCELLED')
              .map(status => {
                const count = stats.ordersByStatus[status]
                const share =
                  stats.orderCount === 0 ? 0 : (count / stats.orderCount) * 100
                return (
                  <div
                    key={status}
                    className="grid grid-cols-[92px_1fr_34px] items-center gap-3"
                  >
                    <StatusBadge status={status} />
                    <span className="h-2 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full min-w-0.5 rounded-full bg-accent"
                        style={{ width: `${share}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-[0.8rem]">
                      {count}
                    </span>
                  </div>
                )
              })}
          </div>

          <h3 className="mt-5 mb-2.5 text-[0.72rem] tracking-[0.14em] text-muted uppercase">
            Low stock
          </h3>
          {stats.lowStock.length === 0 ? (
            <p className="text-muted">Everything is above ten units.</p>
          ) : (
            <ul className="grid gap-2.5">
              {stats.lowStock.map(product => (
                <li key={product.id} className="flex items-center gap-3">
                  <MiniArt small accent={product.accent}>
                    {product.emoji}
                  </MiniArt>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem]">
                    {product.name}
                  </span>
                  <span
                    className={`stock-pill ${
                      product.stock === 0
                        ? 'bg-danger-soft text-danger'
                        : 'bg-green-soft text-green'
                    }`}
                  >
                    {product.stock}
                  </span>
                  <button
                    type="button"
                    className="btn-solid btn-small"
                    onClick={() => void actions.restock(product.id)}
                  >
                    +10
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="font-display text-[1.35rem] font-500 tracking-[-0.01em]">
            Recent orders
          </h2>
          <ul className="mt-3.5 grid gap-2.75">
            {stats.recentOrders.map(order => (
              <li key={order.id} className="flex items-center gap-3">
                <span className="font-mono text-[0.86rem]">
                  {order.orderNo}
                </span>
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.85rem] text-muted">
                  {order.customerName}
                </span>
                <StatusBadge status={order.status} />
                <span className="price text-[0.92rem]">
                  {money(order.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel mb-4.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[1.35rem] font-500 tracking-[-0.01em]">
            Live activity
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {state.feedState === 'live' ? (
              <button
                type="button"
                className="btn-ghost btn-small"
                onClick={() => actions.stopFeed('done')}
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="btn-solid btn-small"
                onClick={actions.startFeed}
              >
                {state.feedState === 'done' ? 'Replay' : 'Start feed'}
              </button>
            )}
          </div>
        </div>
        <p className="text-muted">
          Server-sent events from{' '}
          <code className="rounded bg-accent-soft px-1 py-0.5 font-mono text-[0.86em]">
            GET /feed/activity
          </code>
          . The docs playground can open the same stream.
        </p>
        <ul id="activity-list" className="mt-3.5 grid gap-2.25">
          {state.activity.length === 0 ? (
            <li className="text-muted">
              Waiting for events… place an order in another tab.
            </li>
          ) : (
            state.activity.map(event => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-[9px] bg-cream px-3 py-2.25"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-[0.9rem]"
                  aria-hidden="true"
                >
                  {kActivityIcon[event.type]}
                </span>
                <span className="min-w-0 flex-1 text-[0.86rem]">
                  {event.message}
                </span>
                <time className="whitespace-nowrap font-mono text-[0.72rem] text-muted">
                  {new Date(event.at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </time>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel mb-4.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[1.35rem] font-500 tracking-[-0.01em]">
            Catalog
          </h2>
          <p className="text-muted">
            Stock saves individually; delete is refused for products with order
            history.
          </p>
        </div>
        {products == null ? (
          <div className="skeleton" />
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3.5 w-full border-collapse">
              <thead>
                <tr>
                  {['', 'Product', 'Stock', ''].map((label, index) => (
                    <th
                      key={index}
                      className="border-b border-line-strong px-2.5 py-2 text-left text-[0.68rem] font-700 tracking-[0.13em] text-muted uppercase"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <AdminProductRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProductForm />
    </Page>
  )
}
