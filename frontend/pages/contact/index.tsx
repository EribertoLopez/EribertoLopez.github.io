import Container from '../../components/container'
import Layout from '../../components/layout'

import Seo from '../../components/seo'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './contact.module.css'
import Image from "next/image";

export default function Index() {

  return (
    <div style={{ background: '#b3dcc6'}}>
      <Layout>
        <Seo title="Contact" description="Get in touch with Eriberto Lopez." path="/contact" noindex />
        <Container>
            <div className={styles.contact}>
                <div >Under Construction </div>
                <div >Contact Me</div>
                <Image src={myImage.src} alt="shibe" onClick={() => console.log('shibeee')} width={50} height={50}/>
            </div>
        </Container>
      </Layout>
    </div>
  )
}

