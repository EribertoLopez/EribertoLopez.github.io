// Site-wide settings used for SEO tags, the sitemap and the RSS feed.
export const SITE_URL = 'https://eribertolopez.com'
export const SITE_NAME = 'Eriberto Lopez'
export const SITE_AUTHOR = 'Eriberto Lopez'
export const SITE_DESCRIPTION =
  'Eriberto (Eri) Lopez is a software engineer writing about agentic applications, systems design, distributed systems and the experiments he is building.'
export const DEFAULT_OG_IMAGE = '/assets/blog/agentic-engineering/cover.png'
export const TWITTER_HANDLE = ''

/** Turns a site-relative path ("/latest/foo") into an absolute URL. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//.test(path)) return path
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${encodeURI(clean)}`
}
