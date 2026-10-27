import type { AuthedHandler, MakeExamplesType } from 'core/handler'
import { authedApi } from 'core/access'
import { createOrder, type CheckoutItem, type OrderView } from 'core/services'
import type { WithStatusCode } from 'tealina/utility-types'

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
  res.status(201).send(createOrder(res.locals, req.body.items, req.body.note))
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
