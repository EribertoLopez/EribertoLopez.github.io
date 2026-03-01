import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Container from '../../components/container'
import PostBody from '../../components/post-body'
import PostHeader from '../../components/post-header'
import Layout from '../../components/layout'
import { getPostBySlug, getPostsByCategory } from '../../lib/api'
import PostTitle from '../../components/post-title'
import Head from 'next/head'
import type PostType from '../../types/post'
import { Sections } from '../../lib/ConfigUtils'
import SidebarLayout from '../../components/SidebarLayout'
import markdownToHtml from '../../lib/markdownToHtml'

type Props = {
  post: PostType
  preview?: boolean
}

export default function AIPost({ post, preview }: Props) {
  const router = useRouter()
  const currentTheme = Sections.AI
  const title = `${post.title} | ${post.date}`

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  return (
    <Layout preview={preview}>
      <Container>
        {router.isFallback ? (
          <PostTitle>Loading…</PostTitle>
        ) : (
          <SidebarLayout
            headTitle={`AI | Eriberto Lopez`}
            currentTheme={currentTheme}
            onThemeChange={() => {}}
            contentImage={post.coverImage}
          >
            <article className="mb-32">
              <Head>
                <title>{title}</title>
                <meta property="og:image" content={post.ogImage?.url} />
              </Head>
              <PostHeader
                title={post.title}
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
    'category',
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
  const posts = getPostsByCategory('agentic-engineering', ['slug'])

  return {
    paths: posts.map((post) => ({
      params: {
        slug: post.slug,
      },
    })),
    fallback: false,
  }
}
