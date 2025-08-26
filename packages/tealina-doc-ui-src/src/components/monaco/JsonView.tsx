import { useAtomValue } from 'jotai'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { themeAtom } from '../../atoms/themeAtom'
// import { useMonaco } from './useMonaco'
export const JsonView = ({
  value,
  className,
  language,
  ref,
}: {
  value: string
  language?: 'json' | 'text'
  className?: string
  ref?: React.ClassAttributes<SyntaxHighlighter>['ref']
}) => {
  const curTheme = useAtomValue(themeAtom)
  return (
    <SyntaxHighlighter
      style={curTheme === 'dark' ? vscDarkPlus : vs}
      language={language}
      className={className}
      ref={ref}
    >
      {value}
    </SyntaxHighlighter>
  )
}
