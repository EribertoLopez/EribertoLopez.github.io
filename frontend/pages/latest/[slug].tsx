import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Container from '../../components/container'
import PostBody from '../../components/post-body'
import PostHeader from '../../components/post-header'
import Layout from '../../components/layout'
import { getPostBySlug, getPublishedPosts } from '../../lib/api'
import PostTitle from '../../components/post-title'
import Seo from '../../components/seo'
import { blogPostingJsonLd } from '../../lib/jsonld'
import markdownToHtml from '../../lib/markdownToHtml'
import type PostType from '../../types/post'
import { Sections } from '../../lib/ConfigUtils'
import SidebarLayout from '../../components/SidebarLayout'

type Props = {
  post: PostType
  morePosts: PostType[]
  preview?: boolean
  currentTheme: Sections
}

export default function Post({ post, morePosts, preview, currentTheme = Sections.Posts }: Props) {
  const router = useRouter()
  const title = `${post.title} | ${post.date}`
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }
  return (
    <Layout preview={preview}>
      <Container>
        {/* <Header /> */}
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <SidebarLayout
            headTitle={`${post.title} | Eriberto Lopez`}
            currentTheme={currentTheme}
            onThemeChange={() => {}}
            contentImage={post.coverImage} // TODO: fix :(            
          >
            <article className="mb-32">
              <Seo
                title={post.title}
                description={post.excerpt}
                path={`/latest/${post.slug}`}
                image={post.ogImage?.url || post.coverImage}
                type="article"
                publishedTime={post.date}
                tags={post.tags}
                jsonLd={blogPostingJsonLd({
                  title: post.title,
                  excerpt: post.excerpt,
                  date: post.date,
                  path: `/latest/${post.slug}`,
                  image: post.ogImage?.url || post.coverImage,
                  tags: post.tags,
                })}
              />
              <PostHeader
                title={post.title}
                readingTime={post.readingTime}
                tags={post.tags}
                coverImage={post.coverImage}
                date={post.date}
                author={post.author}
                currentTheme={currentTheme}
              />
              <PostBody content={post.content} />
            </article>
          </SidebarLayout>
        )}
      </Container>
    </Layout>
  )
}

type Params = {
  params: {
    slug: string
  }
}

export async function getStaticProps({ params }: Params) {
  const post = getPostBySlug(params.slug, [
    'title',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
    'coverImage',
    'excerpt',
    'tags',
    'readingTime',
  ])
  const content = await markdownToHtml(post.content || '')

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  }
}

export async function getStaticPaths() {
  const posts = getPublishedPosts(['slug'])

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      }
    }),
    fallback: false,
  }
}
