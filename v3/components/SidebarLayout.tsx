import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import { Sections, themes } from '../lib/ConfigUtils';
import Head from 'next/head';
import Container from './container';
import Layout from './layout';
import styles from './Header.module.css';
import ContentArea from './ContentArea';

const ContentHeader = ({ currentTheme }: { currentTheme: string }) => {
    return (
        <header
            className={`${styles.header} ${styles.headerBackground}`}
            style={{backgroundImage: `url(${themes[currentTheme]})`}}
        >
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
                {Object.entries(Sections).map(([key, value]) => {
                    console.log('key', key, value, Sections.Home, key == Sections.Home)

                    return (
                        <li key={value}>
                            <Link 
                                href={value == Sections.Home ? "/" : `/${value.toLowerCase()}`}
                                className={`${styles.navContentLink} hover:text-blue-400 transition-colors`}
                            >
                                {value.charAt(0).toUpperCase() + value.slice(1)}
                            </Link>
                        </li>
                    );
                })}
              </ul>
            </nav>
            
            <div id="SOCIALS" className={styles.socialContent}>
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
    <div>
        <Head>
            <title>{headTitle}</title>
        </Head>
        <Layout>
            <Container>
                <ContentHeader currentTheme={currentTheme} />
                <ContentArea>{children}</ContentArea>
            </Container>
        </Layout>
    </div>
  );
};
  
export default SidebarLayout;