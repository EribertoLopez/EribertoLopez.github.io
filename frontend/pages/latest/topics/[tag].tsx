import MoreStories from '../../../components/more-stories'
import Intro from '../../../components/intro'
import Seo from '../../../components/seo'
import TopicFilter from '../../../components/topic-filter'
import SidebarLayout from '../../../components/SidebarLayout'
import { getAllTags, getPostsByTag } from '../../../lib/api'
import { Sections } from '../../../lib/ConfigUtils'
import Post from '../../../types/post'

type Topic = { tag: string; slug: string; count: number }

type Props = {
  topic: Topic
  topics: Topic[]
  posts: Post[]
}

export default function TopicPage({ topic, topics, posts }: Props) {
  const description = `Posts about ${topic.tag} by Eriberto Lopez.`
  return (
    <SidebarLayout
      headTitle={`${topic.tag} | Eriberto Lopez`}
      currentTheme={Sections.Posts}
      onThemeChange={() => {}}
      contentImage={posts[0]?.coverImage}
    >
      <div>
        <Seo
          title={`${topic.tag} posts`}
          description={description}
          path={`/latest/topics/${topic.slug}`}
          image={posts[0]?.coverImage}
        />
        <Intro currentTheme={Sections.Posts} currentThemeIntro={`${description} `} />
        <TopicFilter topics={topics} active={topic.slug} />
        <MoreStories title={topic.tag} posts={posts} currentTheme={Sections.Posts} />
      </div>
    </SidebarLayout>
  )
}

type Params = { params: { tag: string } }

export async function getStaticProps({ params }: Params) {
  const topics = getAllTags()
  const topic = topics.find((t) => t.slug === params.tag)
  const posts = getPostsByTag(params.tag, [
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'tags',
    'readingTime',
  ])
  return { props: { topic, topics, posts } }
}

export async function getStaticPaths() {
  return {
    paths: getAllTags().map((t) => ({ params: { tag: t.slug } })),
    fallback: false,
  }
}
