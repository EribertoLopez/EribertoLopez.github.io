import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import { Sections, themes } from '../lib/ConfigUtils';
import Head from 'next/head';
import ContentArea from './ContentArea';
import Sidebar from './Sidebar';
import Container from './container';
import Layout from './layout';
import styles from './Header.module.css';

const Header = ({ currentTheme }: { currentTheme: string }) => {
    return (
        <header 
            className={styles.header}
            style={{ 
                // backgroundImage: 'url(src/images/me_infront_of_HPC_20180129_163043.jpg)' 
                // backgroundImage: 'url(src/images/20170108_123337.jpg)', 
                backgroundImage: `url(${themes[currentTheme]})`, 
                // backgroundImage: 'url(src/images/me_infront_of_HPC_20180129_163043.jpg)', 
                // backgroundSize: '175%', // Adjusts the size of the background image
                backgroundSize: 'cover', // Adjusts the size of the background image
                backgroundPosition: 'center', // Centers the background image
                backgroundPositionY: '100%',
                backgroundRepeat: 'no-repeat', // Prevents the background image from repeating
                // width: '30%',
                // right: 'auto',
                position: 'fixed'
                // width: '25rem'
                // position: 'absolute',
                // top: 0,
                // left: 0,
                // bottom: 0,
                // right: 0,
                // background: 'linear-gradient(to bottom, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
                // background: '-webkit-linear-gradient(top, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
              }}
        
        >
            {/* <div 
                id="OVERLAY"
                style={{
                zIndex: 1,
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                // background: 'linear-gradient(to bottom, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
                background: '-webkit-linear-gradient(top, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
                // background: '-moz-linear-gradient(top, rgba(22,27,33,0) 0%, rgba(22,27,33,0.01) 1%, rgba(22,27,33,0.7) 70%, rgba(22,27,33,0.7) 100%)',
                }}
            ></div> */}
          <div className={styles.overlay}></div>
          <div className={styles.headerImage}></div>
          
          <div className={styles.headerContent} >
            <div className="flex justify-between items-center">
              <div>
                <h1 className={styles.headerTitle}>Eriberto Lopez</h1>
                <p className={styles.headerDescription}>
                    Full-stack developer passionate about creating beautiful and functional web experiences.
                </p>
              </div>
              
              <button className={styles.mobileMenu}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            <nav className={styles.navContent}>
              <ul className="space-y-2">
                {Object.entries(Sections).map(([key, _]) => {
                    console.log('key', key, Sections.Home, key == Sections.Home)
                    return (
                        <li key={key}>
                        <Link 
                            href={key == Sections.Home ? "/" : `/${key.toLowerCase()}`}
                            className="text-lg hover:text-blue-400 transition-colors"
                            // onClick={(e) => {
                            // // e.preventDefault();
                            // onThemeChange(key as Sections)
                            // // console.log(key)
                            // }}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Link>
                        {/* <a 
                            href={key == Sections.Home ? "/" : `/${key.toLowerCase()}`}
                            className="text-lg hover:text-blue-400 transition-colors"
                            onClick={(e) => {
                            e.preventDefault();
                            onThemeChange(key as Sections)
                            // console.log(key)
                            }}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                        </a> */}
                        </li>
                    );
                })}
              </ul>
            </nav>
            
            {/* <div className={styles.socialContent}>
              <a href="#" className="hover:text-blue-400">
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-blue-400">
                <span className="sr-only">Twitter</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            </div> */}
            <div id="SOCIALS" className={styles.socialContent}>
            {/* <div id="SOCIALS" className={styles.socialContent}> */}
            {/* <div id="SOCIALS" className={styles.socialContent} style={{zIndex: 1, position: 'relative'}}> */}
            {/* <div id="SOCIALS" className="flex space-x-4" style={{zIndex: 2, position: ''}}> */}
                <a href="https://github.com" className="text-neutral-400 hover:text-white transition-colors">
                <Github size={20} />
                </a>
                <a href="https://twitter.com" className="text-neutral-400 hover:text-white transition-colors">
                <Twitter size={20} />
                </a>
                <a href="https://linkedin.com" className="text-neutral-400 hover:text-white transition-colors">
                <Linkedin size={20} />
                </a>
                <a href="mailto:contact@example.com" className="text-neutral-400 hover:text-white transition-colors">
                <Mail size={20} />
                </a>
            </div>
            
          </div>
        </header>

    )
};

const SidebarLayout = ({headTitle, currentTheme, onThemeChange, children}: {headTitle: string, currentTheme: string, onThemeChange: (t: Sections) => void, children: React.ReactElement}) => {
  return (

        <Layout>
            <Container>
                <Header currentTheme={currentTheme}/>
                {/* TODO: check if correct pattern */}
                {children}
                {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
                {/* <LandingPage /> */}
                {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
            </Container>
        </Layout>

  );
};
// const SidebarLayout = ({headTitle, currentTheme, onThemeChange, children}: {headTitle: string, currentTheme: string, onThemeChange: (t: Sections) => void, children: React.ReactElement}) => {
//   return (
//     <div>
//         <Head>
//             <title>{headTitle}</title>
//         </Head>
//         <Sidebar currentTheme={themes[currentTheme]} onThemeChange={onThemeChange} />
//         <Layout>
//             <Container>
//                 {/* TODO: check if correct pattern */}
//                 {children}
//                 {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
//                 {/* <LandingPage /> */}
//                 {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
//             </Container>
//         </Layout>
//   </div>
//   );
// };

export default SidebarLayout;