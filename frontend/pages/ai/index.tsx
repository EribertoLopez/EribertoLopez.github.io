import MoreStories from '../../components/more-stories'
import HeroPost from '../../components/hero-post'
import Intro from '../../components/intro'
import { getPostsByCategory } from '../../lib/api'
import Post from '../../types/post'
import { useState } from 'react'
import SidebarLayout from '../../components/SidebarLayout'
import { Sections } from '../../lib/ConfigUtils'

type Props = {
  allPosts: Post[]
}

const Content = ({ currentTheme, allPosts }: { currentTheme: Sections; allPosts: Post[] }) => {
  const publishedPosts = allPosts.filter((post) => post.isPublished === true)
  const heroPost = publishedPosts[0]
  const morePosts = publishedPosts.slice(1)
  const description = 'Exploring agentic engineering — AI agents that ship real work. '

  return (
    <div>
      <Intro currentTheme={currentTheme} currentThemeIntro={description} />
      {heroPost && (
        <HeroPost
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          date={heroPost.date}
          author={heroPost.author}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          currentTheme={currentTheme}
        />
      )}
      {morePosts.length > 0 && <MoreStories posts={morePosts} currentTheme={currentTheme} />}
    </div>
  )
}

export default function AIIndex({ allPosts }: Props) {
  const [currentTheme] = useState<Sections>(Sections.AI)
  const heroPost = allPosts.filter((p) => p.isPublished)[0]

  return (
    <SidebarLayout
      headTitle="AI | Eriberto Lopez"
      currentTheme={currentTheme}
      onThemeChange={() => {}}
      contentImage={heroPost?.coverImage || ''}
    >
      <Content currentTheme={currentTheme} allPosts={allPosts} />
    </SidebarLayout>
  )
}

export const getStaticProps = async () => {
  const allPosts = getPostsByCategory('agentic-engineering', [
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
  ])

  return {
    props: { allPosts },
  }
}
