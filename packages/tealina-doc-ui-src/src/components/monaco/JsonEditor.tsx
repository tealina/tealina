import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-json'
import '../../assets/css/vsc-plus.css'
import '../../assets/css/vs.css'
import { useState } from 'react'
import EditorModule from 'react-simple-code-editor'
import { useAtomValue } from 'jotai'
import { themeAtom } from '../../atoms/themeAtom'

// The package is CommonJS with an `__esModule` marker. The dev optimizer wraps its
// whole exports object as the default export, so the component sits one level below
// where the types say it is; take whichever shape actually arrived.
const Editor =
  (EditorModule as unknown as { default?: typeof EditorModule }).default ??
  EditorModule
export const JsonEditor = ({
  defaultValue,
  className,
  onBlur,
  hint,
}: {
  hint?: string
  className: string
  defaultValue: string
  onBlur: (e: string) => void
}) => {
  const [value, setValue] = useState(defaultValue)

  const curTheme = useAtomValue(themeAtom)
  return (
    <div
      className="p1"
      style={{ background: curTheme === 'dark' ? '#1e1e1e' : 'white' }}
    >
      {/* <JsonView value={`{"ha":"b","c":2}`} language='json' /> */}
      <Editor
        placeholder={hint}
        onBlur={() => {
          onBlur(value)
        }}
        value={value}
        onValueChange={setValue}
        className={className}
        textareaClassName="focus:outline-none"
        // highlight={(code) => <JsonView value={code} language="json" className={className} />}
        highlight={code => highlight(code, languages.json, 'json')}
      />
    </div>
  )
}
