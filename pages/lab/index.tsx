import Container from '../../components/container'
import Layout from '../../components/layout'

import Head from 'next/head'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './lab.module.css'

export default function Index() {

  return (
    <div style={{ background: '#b3dcc6'}}>
      <Layout>
        <Head>
          <title>{`Lab | Eriberto Lopez`}</title>
        </Head>
        <Container>
            <div className={styles.lab}>
                <div >Under Construction </div>
                <div >Lab</div>
                <img src={myImage.src} alt="shibe" onClick={() => console.log('shibeee')}/>
            </div>
        </Container>
      </Layout>
    </div>
  )
}

