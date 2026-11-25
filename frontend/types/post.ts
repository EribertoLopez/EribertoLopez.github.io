import type Author from './author'

type PostType = {
  isPublished: boolean
  slug: string
  title: string
  date: string
  coverImage: string
  author: Author
  excerpt: string
  ogImage: {
    url: string
  }
  content: string
  category?: string
  tags?: string[]
  readingTime?: number
}

export default PostType
