import { MYGITHUB, MYLINKEDIN } from './ConfigUtils'
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from './site'

export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_AUTHOR,
    alternateName: 'Eri Lopez',
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    jobTitle: 'Software Engineer',
    sameAs: [MYGITHUB, MYLINKEDIN],
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }
}

type Article = {
  title: string
  excerpt?: string
  date: string
  path: string
  image?: string
  tags?: string[]
}

export function blogPostingJsonLd({ title, excerpt, date, path, image, tags = [] }: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: excerpt,
    datePublished: date,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    image: image ? absoluteUrl(image) : undefined,
    keywords: tags.length ? tags.join(', ') : undefined,
    author: { '@type': 'Person', name: SITE_AUTHOR, url: SITE_URL },
  }
}
