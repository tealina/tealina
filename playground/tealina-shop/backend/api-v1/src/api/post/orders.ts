import type { AuthedHandler, MakeExamplesType } from 'core/handler'
import { authedApi } from 'core/access'
import type { WithStatusCode } from 'tealina/utility-types'
import type { OrderView } from '../../model.js'
import { createOrder, type CheckoutItem } from '../../store/index.js'

export interface CheckoutPayload {
  /** Product ids and quantities; a repeated product is merged. */
  items: CheckoutItem[]
  /** Optional note shown to the shop. */
  note?: string
}

type ApiType = AuthedHandler<
  { body: CheckoutPayload },
  WithStatusCode<201, OrderView>
>

/**
 * Place an order. Stock is checked and decremented in the same step; a line that asks
 * for more than the shelf holds fails the whole order.
 */
const handler: ApiType = async (req, res) => {
  const order = createOrder(
    Number(res.locals.userId),
    req.body.items,
    req.body.note,
  )
  res.status(201).send(order)
}

export default authedApi(handler)

export const examples: MakeExamplesType<ApiType> = {
  body: [
    {
      key: 'single',
      summary: 'One bag of beans',
      value: { items: [{ productId: 1, quantity: 1 }] },
    },
    {
      key: 'bundle',
      summary: 'Coffee, papers and a note',
      value: {
        items: [
          { productId: 2, quantity: 2 },
          { productId: 9, quantity: 1 },
        ],
        note: 'Grind half of it for a moka pot, please.',
      },
    },
  ],
}
