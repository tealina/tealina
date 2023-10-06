import { useAtomValue } from 'jotai'
import { syntaxColorAtom } from '../atoms/themeAtom'

export function CommentSummary({ comment }: { comment?: string }) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  return (
    <p className="whitespace-pre" style={{ color: TypeColors.comment }}>
      <span> /** </span>
      <span>{comment}</span>
      <span> */ </span>
    </p>
  )
}
