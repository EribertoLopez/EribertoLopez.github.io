import Container from '../components/container'
import Layout from '../components/layout'
import Head from 'next/head'
import LandingPage from '../components/LandingPage'
import Sidebar from '../components/Sidebar'
import { useState, useCallback } from 'react'
import ContentArea from '../components/ContentArea'
import { themes, Sections } from '../lib/ConfigUtils'
import SidebarLayout from '../components/SidebarLayout'


export default function Index() {
  const [currentTheme, setCurrentTheme] = useState<string>(themes[Sections.Home]);
  const handleThemeChange = useCallback((theme: Sections) => {
    setCurrentTheme(themes[theme]);
  }, [themes])

  return (

    <SidebarLayout
      headTitle={`Home | Eriberto Lopez`}
      currentTheme={Sections.Home}
      onThemeChange={handleThemeChange}
    >
      <ContentArea currentTheme={Sections.Home} onThemeChange={handleThemeChange} />
    </SidebarLayout>
    // <div>
    //   <Head>
    //     <title>{`Home | Eriberto Lopez`}</title>
    //   </Head>
    //   <Sidebar currentTheme={currentTheme} onThemeChange={handleThemeChange} />
    //   <Layout>
    //     <Container>
    //       <ContentArea currentTheme={currentTheme} onThemeChange={handleThemeChange} />
    //       {/* <LandingPage /> */}
    //     </Container>
    //   </Layout>
    // </div>
  )
}

