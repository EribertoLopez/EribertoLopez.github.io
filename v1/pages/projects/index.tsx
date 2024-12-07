import Container from '../../components/container'
import Layout from '../../components/layout'

import Head from 'next/head'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './projects.module.css'
import Image from "next/image";

export default function Index() {
  return (
    <div style={{ background: '#b3dcc6'}}>
      <Layout>
        <Head>
          <title>{`Projects | Eriberto Lopez`}</title>
        </Head>
        <Container>
            <div className={styles.projects}>
                <div >Under Construction </div>
                <div >Portfolio</div>
                <Image src={myImage.src} alt="shibe" onClick={() => console.log('shibeee')} width={50} height={50}/>
            </div>
        </Container>
      </Layout>
    </div>
  )
}

