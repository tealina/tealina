import type { OpenHandler, MakeExamplesType } from 'core/handler'
import { openApi } from 'core/access'
import type { ProductList } from '../../model.js'
import { listProducts } from '../../store/index.js'

export interface ProductsQuery {
  /** Case-insensitive match on the name, description or category. */
  keyword?: string
  /** Category id from `GET /categories`; omit for every category. */
  categoryId?: number
  /** @default {newest} */
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating'
  /** @default {1} */
  page?: number
  /** @default {8} */
  pageSize?: number
}

type ApiType = OpenHandler<{ query: ProductsQuery }, ProductList>

/**
 * The storefront's catalog: paged, searchable and sortable.
 *
 * Filtering and sorting happen server-side; the page keeps the query in the url so a
 * refresh lands on the same shelf.
 */
const handler: ApiType = async (req, res) => {
  const { keyword, categoryId, sort, page, pageSize } = req.query
  res.send(
    listProducts({
      keyword,
      categoryId: categoryId == null ? undefined : Number(categoryId),
      sort,
      page: page == null ? undefined : Number(page),
      pageSize: pageSize == null ? undefined : Number(pageSize),
    }),
  )
}

export default openApi(handler)

export const examples: MakeExamplesType<ApiType> = {
  query: [
    {
      key: 'beans',
      summary: 'First page of coffee beans',
      value: { categoryId: 1, page: 1, pageSize: 8 },
    },
    {
      key: 'search',
      summary: 'Search for a grinder, cheapest first',
      value: { keyword: 'grinder', sort: 'price-asc' },
    },
  ],
}
