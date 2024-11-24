import Container from '../components/container'
import Layout from '../components/layout'
import Head from 'next/head'
import LandingPage from '../components/LandingPage'

export default function Index() {
  return (
    <div>
      
    <Head>
      <title>{`Home | Eriberto Lopez`}</title>
    </Head>
    <Layout>
      <Container>
        <LandingPage />
      </Container>
    </Layout>
    </div>
  )
}

