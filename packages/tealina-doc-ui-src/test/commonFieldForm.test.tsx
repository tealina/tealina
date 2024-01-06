import type { CommonFieldsType } from '@tealina/doc-ui'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { commonFieldsAtom } from '../src/atoms/jsonSourceAtom'
import { ComonFields } from '../src/components/features/playground/CommonFields'
import { kConfigKey } from '../src/constans/configKeys'
import { TestProvider } from './helper'

describe('test common field setting', () => {
  test('form', async () => {
    const mockCommonField: CommonFieldsType = {
      headers: {
        Authorization: 'string',
      },
      body: {
        skip: { type: 'number', default: 0 },
        take: { type: 'number', default: 6 },
      },
    }
    const handleSave = () => {}
    const screen = render(
      <TestProvider initialValues={[[commonFieldsAtom, mockCommonField]]}>
        <ComonFields onSaved={handleSave} />
      </TestProvider>,
    )
    const inputs = screen.container.querySelectorAll('input')
    expect(inputs.length).eq(3)
    const [auth, skip, take] = inputs
    expect(auth.id).eq('headers_Authorization')
    expect(skip?.getAttribute('value')).eq('0')
    expect(take?.getAttribute('value')).eq('6')
    fireEvent.change(auth, { target: { value: 'mock token' } })
    fireEvent.change(skip, { target: { value: '2' } })
    fireEvent.change(take, { target: { value: '10' } })
    fireEvent.click(screen.getByText('Save'))
    await waitFor(() => {
      window.sessionStorage.getItem(kConfigKey.FILEDS_VALUES)
    })
    const result = window.sessionStorage.getItem(kConfigKey.FILEDS_VALUES)
    expect(result).not.null
    expect(JSON.parse(result!)).toMatchObject({
      headers: {
        Authorization: 'mock token',
      },
      body: { skip: 2, take: 10 },
    })
  })
})
