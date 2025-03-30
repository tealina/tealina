import { useAtomValue } from 'jotai'
import { syntaxColorAtom } from '../atoms/themeAtom'

export function CommentSummary({ comment }: { comment?: string }) {
  const TypeColors = useAtomValue(syntaxColorAtom)
  return (
    <div className="whitespace-pre-wrap" style={{ color: TypeColors.comment }}>
      <span> /** </span>
      <span>{comment}</span>
      <span> */ </span>
    </div>
  )
}
