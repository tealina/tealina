import { FormInstance } from 'antd'
import { atom, useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { commonInitialValueAtom } from '../../../atoms/jsonSourceAtom'

export interface MemoState {
  formValues: any
  states: {
    isError: boolean
    statusCode?: number
    code: string
  }
}

const DefaultCache: MemoState = {
  formValues: null,
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
  commonInitialValue: Record<string, any>,
  values: any,
  form: FormInstance<any>,
) =>
  Object.entries(commonInitialValue).forEach(([parentKey, record]) => {
    if (!(parentKey in values)) return
    const nest = values[parentKey]
    Object.entries(record).forEach(([key, value]) => {
      if (!(key in nest)) return
      form.setFieldValue([parentKey, key], value)
    })
  })

export function useCacheStates({
  cacheKey,
  form,
}: {
  cacheKey: string
  form: FormInstance<any>
}) {
  const [getCache, setCache] = useAtom(memoMutateAtom)
  const commonInitialValue = useAtomValue(commonInitialValueAtom)
  const statesRef = useRef<MemoState['states']>()
  const formValueRef = useRef<any>()
  const cache = getCache(cacheKey)
  const [states, setStates] = useState(cache.states)
  statesRef.current = states
  const cacheFormValue = (formValue: any) => {
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
