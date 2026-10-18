import { VariousResponseType } from '@tealina/doc-ui'
import type { FormInstance } from 'antd'
import { atom, useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { commonInitialValueAtom } from '../../../atoms/jsonSourceAtom'

export interface MemoState {
  formValues: Record<string, unknown>
  states: VariousResponseType
}

const DefaultCache: MemoState = {
  formValues: {},
  states: { type: 'json', status: 200, result: '' },
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
  const formValueRef = useRef<Record<string, unknown> | null>(null)
  const cache = getCache(cacheKey)
  const [states, setStates] = useState(cache.states)
  // Read from the cleanup below, which must keep running only on unmount: the
  // latest value is copied into a ref after each commit instead of being listed
  // as a dependency.
  const latest = useRef({ form, cacheKey, setCache, cache })
  useEffect(() => {
    latest.current = { form, cacheKey, setCache, cache }
  })
  const statesRef = useRef(states)
  useEffect(() => {
    statesRef.current = states
  }, [states])
  const cacheFormValue = (formValue: Record<string, unknown>) => {
    formValueRef.current = formValue
  }
  useEffect(() => {
    if (formValueRef.current != null) return
    initFormValue(commonInitialValue, form.getFieldsValue(), form)
  }, [commonInitialValue, form])
  useEffect(() => {
    latest.current.form.setFieldsValue(latest.current.cache.formValues)
    return () => {
      const { cacheKey, setCache } = latest.current
      setCache(cacheKey, {
        formValues: formValueRef.current ?? {},
        states: statesRef.current,
      })
    }
  }, [])
  return { states, cacheFormValue, setStates }
}
