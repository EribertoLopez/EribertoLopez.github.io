import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Container from '../../components/container'
import PostBody from '../../components/post-body'
import PostHeader from '../../components/post-header'
import Layout from '../../components/layout'
import { getProjectBySlug, getAllProjects } from '../../lib/api'
import PostTitle from '../../components/post-title'
import Head from 'next/head'
import markdownToHtml from '../../lib/markdownToHtml'
import { Sections } from '../../lib/ConfigUtils'
import ProjectType from '../../interfaces/project'
import SidebarLayout from '../../components/SidebarLayout'
import Gallery from '../../components/gallery'

type Props = {
  post: ProjectType
  morePosts: ProjectType[]
  preview?: boolean
  currentTheme: Sections
}
//TODO: Actually the same as the latest/[slug].tsx but using  ProjectType
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
            headTitle={`Home | Eriberto Lopez`}
            currentTheme={currentTheme}
            onThemeChange={() => {}}
            contentImage={post.coverImage} // TODO: fix :(            
          >
            <article className="mb-32">
              <Head>
                <title>{title}</title>
                <meta property="og:image" content={post.ogImage.url} />
              </Head>
              <PostHeader
                title={post.title}
                coverImage={post.coverImage}
                date={post.date}
                author={post.author}
                currentTheme={currentTheme}
              />
              <PostBody content={post.content} />
              <div className="mt-16">
                {post.gallery && <Gallery images={
                  post.gallery.map((g, i) => {
                    return {
                    src: g, gridArea: `img${i+1}`, alt: `alt-${i+1}`
                  }})} 
                />}
              </div>
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
  const post = getProjectBySlug(params.slug, [
    'title',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
    'coverImage',
    'gallery'
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
  const posts = getAllProjects(['slug'])

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
