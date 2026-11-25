import Head from 'next/head'
import {
  DEFAULT_OG_IMAGE,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  TWITTER_HANDLE,
  absoluteUrl,
} from '../lib/site'

type Props = {
  /** Page title without the site name, e.g. "Latest". Omit on the home page. */
  title?: string
  description?: string
  /** Site-relative path of this page, used for the canonical URL. */
  path: string
  /** Site-relative or absolute image URL for link previews. */
  image?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  tags?: string[]
  /** Keep the page out of search results (old resume versions, drafts). */
  noindex?: boolean
  /** Structured data (JSON-LD) to embed. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/** Strips markdown/HTML and trims a description to ~160 characters. */
export function toDescription(text?: string, max = 160): string {
  if (!text) return SITE_DESCRIPTION
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_#>\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

const Seo = ({
  title,
  description,
  path,
  image,
  type = 'website',
  publishedTime,
  tags = [],
  noindex = false,
  jsonLd,
}: Props) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Software engineer`
  const desc = toDescription(description)
  const url = absoluteUrl(path)
  const img = absoluteUrl(image || DEFAULT_OG_IMAGE)

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      <meta key="description" name="description" content={desc} />
      <link key="canonical" rel="canonical" href={url} />
      {noindex && <meta key="robots" name="robots" content="noindex, follow" />}

      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:title" property="og:title" content={title || SITE_NAME} />
      <meta key="og:description" property="og:description" content={desc} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={img} />
      {publishedTime && (
        <meta key="article:published_time" property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && <meta key="article:author" property="article:author" content={SITE_AUTHOR} />}
      {tags.map((tag) => (
        <meta key={`article:tag:${tag}`} property="article:tag" content={tag} />
      ))}

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title || SITE_NAME} />
      <meta key="twitter:description" name="twitter:description" content={desc} />
      <meta key="twitter:image" name="twitter:image" content={img} />
      {TWITTER_HANDLE && <meta key="twitter:site" name="twitter:site" content={TWITTER_HANDLE} />}

      {jsonLd && (
        <script
          key="jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </Head>
  )
}

export default Seo
