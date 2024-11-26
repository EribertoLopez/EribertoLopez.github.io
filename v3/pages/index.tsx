import Container from '../components/container'
import Layout from '../components/layout'
import Head from 'next/head'
import LandingPage from '../components/LandingPage'
import Sidebar from '../components/Sidebar'
import { useState, useCallback } from 'react'
import ContentArea from '../components/ContentArea'

export enum Sections {
  Home = 'Home',
  Projects = 'Projects',
  Blog = 'Blog'
}

export const themes: {[key in Sections]: string }= {
[Sections.Home]: 'url(public/assets/images/me_infront_of_HPC_20180129_163043.jpg)',
[Sections.Projects]: 'url(public/assets/images/20170108_123337.jpg)',
// [Sections.Projects]: 'url(src/images/projects_background.jpg)',
[Sections.Blog]: 'url(src/images/blog_background.jpg)',
}

export default function Index() {
  const [currentTheme, setCurrentTheme] = useState<string>(themes[Sections.Home]);
  const handleThemeChange = useCallback((theme: Sections) => {
    setCurrentTheme(themes[theme]);
  }, [themes])

  return (
    <div>
      <Head>
        <title>{`Home | Eriberto Lopez`}</title>
      </Head>
      <Layout>
        <Sidebar currentTheme={currentTheme} onThemeChange={handleThemeChange} />
        <Container>
          <ContentArea currentTheme={currentTheme} onThemeChange={handleThemeChange} />
          {/* <LandingPage /> */}
        </Container>
      </Layout>
    </div>
  )
}

