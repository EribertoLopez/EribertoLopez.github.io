import type Author from './author'

type ProjectType = {
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
}

export default ProjectType