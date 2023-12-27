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
  return (
    <div style={{ background: '#b3dcc6'}}>
      <Layout>
        <Head>
          <title>{`Home | Eriberto Lopez`}</title>
        </Head>
        <Container>
          <LandingPage />
        </Container>
      </Layout>
    </div>
  )
}

