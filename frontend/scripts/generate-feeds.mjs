// Writes sitemap.xml, robots.txt and feed.xml (RSS) into the static export.
// Runs after `next build` (see "postbuild" in package.json). Pass an output
// directory as the first argument to write somewhere other than ./out.
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const SITE_URL = 'https://eribertolopez.com'
const SITE_NAME = 'Eriberto Lopez'
const FEED_DESCRIPTION =
  'Writing by Eriberto Lopez on agentic applications, systems design, distributed systems and experiments.'

const root = process.cwd()
const outDir = path.resolve(process.argv[2] || path.join(root, 'out'))
const contentDir = path.join(root, 'content')

if (!fs.existsSync(outDir)) {
  console.log(`[feeds] ${outDir} does not exist (no static export). Skipping.`)
  process.exit(0)
}

const tagToSlug = (tag) =>
  tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const parseTags = (raw) =>
  Array.isArray(raw)
    ? raw.map((t) => String(t).trim()).filter(Boolean)
    : typeof raw === 'string'
      ? raw.split(',').map((t) => t.trim()).filter(Boolean)
      : []

function readPublished(dir) {
  const full = path.join(contentDir, dir)
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data } = matter(fs.readFileSync(path.join(full, file), 'utf8'))
      return { ...data, slug: file.replace(/\.md$/, ''), tags: parseTags(data.tags) }
    })
    .filter((item) => item.isPublished === true)
    .sort((a, b) => (a.date > b.date ? -1 : 1))
}

const xml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const url = (p) => `${SITE_URL}${encodeURI(p)}`
const isoDate = (d) => {
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const posts = readPublished('_posts')
const projects = readPublished('_projects')
const tags = [...new Set(posts.flatMap((p) => p.tags.map(tagToSlug)))]

// ---- sitemap.xml
const entries = [
  { loc: '/', lastmod: posts[0]?.date },
  { loc: '/latest', lastmod: posts[0]?.date },
  { loc: '/ai' },
  { loc: '/projects', lastmod: projects[0]?.date },
  { loc: '/resume' },
  ...tags.map((t) => ({ loc: `/latest/topics/${t}` })),
  ...posts.map((p) => ({ loc: `/latest/${p.slug}`, lastmod: p.date })),
  ...projects.map((p) => ({ loc: `/projects/${p.slug}`, lastmod: p.date })),
]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(({ loc, lastmod }) => {
    const d = lastmod && isoDate(lastmod)
    return `  <url><loc>${xml(url(loc))}</loc>${d ? `<lastmod>${d.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`
  })
  .join('\n')}
</urlset>
`

// ---- robots.txt
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

// ---- feed.xml (RSS 2.0)
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE_NAME)}</title>
    <link>${SITE_URL}/latest</link>
    <description>${xml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${isoDate(posts[0].date)?.toUTCString()}</lastBuildDate>\n` : ''}${posts
  .map((p) => {
    const link = url(`/latest/${p.slug}`)
    const d = isoDate(p.date)
    return `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
${d ? `      <pubDate>${d.toUTCString()}</pubDate>\n` : ''}      <description>${xml(p.excerpt)}</description>
${p.tags.map((t) => `      <category>${xml(t)}</category>`).join('\n')}
    </item>`
  })
  .join('\n')}
  </channel>
</rss>
`

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap)
fs.writeFileSync(path.join(outDir, 'robots.txt'), robots)
fs.writeFileSync(path.join(outDir, 'feed.xml'), feed)
console.log(`[feeds] Wrote sitemap.xml (${entries.length} urls), robots.txt and feed.xml (${posts.length} posts) to ${outDir}`)
