import PostPreview from './post-preview'
import type Post from '../interfaces/post'
import { Sections } from '../lib/ConfigUtils'
import ProjectPreview from './project-preview'
import ProjectType from '../interfaces/project'
import HeroProject from './hero-project'

type Props = {
  posts: ProjectType[]
  currentTheme: Sections
}

const MoreProjects = ({ posts, currentTheme }: Props) => {
  return (
    <section>
      <h2 className="mb-8 text-5xl md:text-7xl font-bold tracking-tighter leading-tight">
        More Projects
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-16 lg:gap-x-32 gap-y-20 md:gap-y-32 mb-32">
        {posts.map((post) => (
          <HeroProject
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
            currentTheme={currentTheme}
          />
        ))}
      </div>
    </section>
  )
}

export default MoreProjects
