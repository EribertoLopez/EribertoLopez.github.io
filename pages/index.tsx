import Container from '../components/container'
import MoreStories from '../components/more-stories'
import HeroPost from '../components/hero-post'
import Intro from '../components/intro'
import Layout from '../components/layout'
import { getAllPosts } from '../lib/api'
import Head from 'next/head'
import { CMS_NAME } from '../lib/constants'
import Post from '../interfaces/post'
import LandingPage from '../components/LandingPage'

type Props = {
  allPosts: Post[]
}

export default function Index({ allPosts }: Props) {
  // const heroPost = allPosts[0]
  // const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )
  return (
    <>
      <Layout>
        <Head>
          {/* <title>{`Next.js Blog Example with ${CMS_NAME}`}</title> */}
          <title>{`Home | Eriberto Lopez`}</title>
        </Head>
        <Container>
          <LandingPage />
        </Container>
      </Layout>
    </>
  )
}

