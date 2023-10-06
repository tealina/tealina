import { Provider } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'

type InitialType = {
  initialValues: any[]
  children: any
}

const HydrateAtoms = ({ initialValues, children }: InitialType) => {
  useHydrateAtoms(initialValues)
  return children
}

export const TestProvider = ({ initialValues, children }: InitialType) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
)
