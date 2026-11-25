import Link from 'next/link'
import { tagToSlugClient } from '../lib/tags'

type Props = {
  readingTime?: number
  tags?: string[]
  className?: string
}

/** Reading time plus topic chips that link to each topic's page. */
const PostMeta = ({ readingTime, tags = [], className = '' }: Props) => {
  if (!readingTime && tags.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm text-neutral-400 ${className}`}>
      {readingTime ? <span>{readingTime} min read</span> : null}
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/latest/topics/${tagToSlugClient(tag)}`}
          className="rounded-full border border-neutral-700 px-3 py-1 text-neutral-300 hover:border-blue-400 hover:text-blue-300 transition-colors"
        >
          {tag}
        </Link>
      ))}
    </div>
  )
}

export default PostMeta
