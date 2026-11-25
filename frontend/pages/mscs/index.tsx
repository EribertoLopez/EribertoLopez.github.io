import Container from '../../components/container'
import Layout from '../../components/layout'

import Seo from '../../components/seo'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './mscs.module.css'
import Image from "next/image";

export default function Index() {

  return (
    <div style={{ background: '#b3dcc6'}}>
      <Layout>
        <Seo title="MS Computer Science" description="Georgia Tech MS in Computer Science, by Eriberto Lopez." path="/mscs" noindex />
        <Container>
            <div className={styles.mscs}>
                <div >Under Construction</div>
                <div >Georgia Tech Masters of Computer Science</div>
                <Image src={myImage.src} alt="shibe" onClick={() => console.log('shibeee')} width={50} height={50}/>
            </div>
        </Container>
      </Layout>
    </div>
  )
}

