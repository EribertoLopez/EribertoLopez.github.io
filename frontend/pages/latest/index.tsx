import MoreStories from '../../components/more-stories'
import HeroPost from '../../components/hero-post'
import Intro from '../../components/intro'
import Seo from '../../components/seo'
import TopicFilter from '../../components/topic-filter'
import { getAllTags, getPublishedPosts } from '../../lib/api'
import Post from '../../types/post'
import SidebarLayout from '../../components/SidebarLayout'
import { Sections } from '../../lib/ConfigUtils'

type Topic = { tag: string; slug: string; count: number }

type Props = {
  allPosts: Post[]
  topics: Topic[]
}

const DESCRIPTION =
  'Writing on agentic applications, systems design, distributed systems, and the experiments I am building and learning from.'

const Content = ({ currentTheme, allPosts, topics }: { currentTheme: Sections; allPosts: Post[]; topics: Topic[] }) => {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1)
  return (
    <div>
      <Intro currentTheme={currentTheme} currentThemeIntro={`${DESCRIPTION} `} />
      <TopicFilter topics={topics} />
      {heroPost && (
        <HeroPost
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          date={heroPost.date}
          author={heroPost.author}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          currentTheme={currentTheme}
          readingTime={heroPost.readingTime}
          tags={heroPost.tags}
        />
      )}
      {morePosts.length > 0 && <MoreStories posts={morePosts} currentTheme={currentTheme} />}
    </div>
  )
}

export default function Index({ allPosts, topics }: Props) {
  const heroPost = allPosts[0]
  return (
    <SidebarLayout
      headTitle={`Latest | Eriberto Lopez`}
      currentTheme={Sections.Posts}
      onThemeChange={() => {}}
      contentImage={heroPost?.coverImage}
    >
      <>
        <Seo title="Blog" description={DESCRIPTION} path="/latest" image={heroPost?.coverImage} />
        <Content currentTheme={Sections.Posts} allPosts={allPosts} topics={topics} />
      </>
    </SidebarLayout>
  )
}

export const getStaticProps = async () => {
  const allPosts = getPublishedPosts([
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
    'tags',
    'readingTime',
  ])

  return {
    props: { allPosts, topics: getAllTags() },
  }
}
