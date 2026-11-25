import Link from 'next/link'

type Topic = { tag: string; slug: string; count: number }

type Props = {
  topics: Topic[]
  /** Slug of the topic being shown, or undefined for "All posts". */
  active?: string
}

/** Row of topic chips shown above the blog list. */
const TopicFilter = ({ topics, active }: Props) => {
  if (topics.length === 0) return null
  const chip = (isActive: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition-colors ${
      isActive
        ? 'border-blue-400 bg-blue-400/10 text-blue-200'
        : 'border-neutral-700 text-neutral-300 hover:border-blue-400 hover:text-blue-300'
    }`
  return (
    <nav aria-label="Blog topics" className="mb-12 flex flex-wrap gap-2">
      <Link href="/latest" className={chip(!active)}>
        All posts
      </Link>
      {topics.map((t) => (
        <Link key={t.slug} href={`/latest/topics/${t.slug}`} className={chip(active === t.slug)}>
          {t.tag} <span className="text-neutral-500">{t.count}</span>
        </Link>
      ))}
    </nav>
  )
}

export default TopicFilter
