import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import { useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { themeAtom } from '../../atoms/themeAtom'
import loader from '@monaco-editor/loader'
// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  },
}

loader.config({ monaco })

export const useMonaco = ({
  readOnly,
  defaultValue,
  language = 'json',
}: Pick<monaco.editor.IEditorOptions, 'readOnly'> & {
  defaultValue?: string
  language?: 'json' | 'text'
}) => {
  const themeMode = useAtomValue(themeAtom)
  const [editorIns, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoEl = useRef(null)
  useEffect(() => {
    if (editorIns == null) return
    monaco.editor.setTheme(themeMode == 'dark' ? 'vs-dark' : 'vs')
  }, [themeMode])
  useEffect(() => {
    const loadP = loader.init()
    loadP.then(m => {
      m.languages.json.jsonDefaults.setDiagnosticsOptions({
        allowComments: true,
      })
      if (editorIns) return
      const editor = m.editor.create(monacoEl.current!, {
        value: defaultValue,
        language,
        theme: themeMode == 'dark' ? 'vs-dark' : 'vs',
        readOnly,
        tabSize: 2,
      })
      setEditor(editor)
    })
    return () => {
      if (editorIns) {
        editorIns.dispose()
        return
      }
      loadP.cancel()
    }
  }, [monacoEl.current])
  return { editor: editorIns, monacoEl }
}
