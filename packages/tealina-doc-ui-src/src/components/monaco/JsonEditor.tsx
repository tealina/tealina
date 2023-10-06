import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { useEffect } from 'react'
import { useMonaco } from './useMonaco'

export const Editor = ({
  defaultValue,
  className,
  onBlur,
}: {
  defaultValue: string
  className?: string
  onBlur: (e: monaco.editor.IStandaloneCodeEditor) => void
}) => {
  const { editor, monacoEl } = useMonaco({ defaultValue })
  useEffect(() => {
    if (editor == null) return
    editor.onDidBlurEditorWidget(() => {
      onBlur(editor)
    })
  }, [editor])
  return <div className={className} ref={monacoEl}></div>
}
