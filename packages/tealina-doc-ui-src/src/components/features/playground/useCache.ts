import type { FormInstance } from 'antd'
import { atom, useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { commonInitialValueAtom } from '../../../atoms/jsonSourceAtom'

export interface MemoState {
  formValues: Record<string, unknown>
  states: {
    isError: boolean
    statusCode?: number
    code: string
  }
}

const DefaultCache: MemoState = {
  formValues: {},
  states: { isError: false, code: '' },
}

const memoAtom = atom(new Map<string, MemoState>())

const memoMutateAtom = atom(
  get => (key: string) => {
    const memo = get(memoAtom)
    return memo.get(key) ?? DefaultCache
  },
  (get, _set, key: string, update: MemoState) => {
    const memo = get(memoAtom)
    memo.set(key, update)
  },
)

const initFormValue = (
  commonInitialValue: Record<string, Record<string, unknown>>,
  values: unknown,
  form: FormInstance<unknown>,
) => {
  const kvs = Object.entries(commonInitialValue)
  const typedValues = values as Record<string, Record<string, unknown>>
  for (const [parentKey, record] of kvs) {
    if (!(parentKey in typedValues)) continue
    const nest = typedValues[parentKey]
    if (typeof nest !== 'object') continue
    for (const [key, value] of Object.entries(record)) {
      if (!(key in nest)) continue
      form.setFieldValue([parentKey, key], value)
    }
  }
}

export function useCacheStates({
  cacheKey,
  form,
}: {
  cacheKey: string
  form: FormInstance<unknown>
}) {
  const [getCache, setCache] = useAtom(memoMutateAtom)
  const commonInitialValue = useAtomValue(commonInitialValueAtom)
  const statesRef = useRef<MemoState['states']>()
  const formValueRef = useRef<Record<string, unknown>>({})
  const cache = getCache(cacheKey)
  const [states, setStates] = useState(cache.states)
  statesRef.current = states
  const cacheFormValue = (formValue: Record<string, unknown>) => {
    formValueRef.current = formValue
  }
  useEffect(() => {
    if (formValueRef.current != null) return
    initFormValue(commonInitialValue, form.getFieldsValue(), form)
  }, [commonInitialValue])
  useEffect(() => {
    form.setFieldsValue(cache.formValues)
    return () => {
      setCache(cacheKey, {
        formValues: formValueRef.current,
        states: statesRef.current ?? DefaultCache.states,
      })
    }
  }, [])
  return { states, cacheFormValue, setStates }
}
