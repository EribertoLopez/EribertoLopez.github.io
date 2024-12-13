import React, { useState } from 'react';
import { Github, Twitter, Linkedin, Mail, X } from 'lucide-react';
import Link from 'next/link';
import { MYEMAIL, MYGITHUB, MYLINKEDIN, MYTWITTER, Sections, themes } from '../lib/ConfigUtils';
import Head from 'next/head';
import Container from './container';
import Layout from './layout';
import styles from './Header.module.css';
import ContentArea from './ContentArea';


const ContentHeader = ({ currentTheme, contentImage }: { currentTheme: string, contentImage: string }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header
            className={`${styles.header} ${styles.headerBackground}`}
            style={{backgroundImage: `url(${contentImage || themes[currentTheme]})`}}
        >
          <div className={styles.overlay}></div>
          <div className={styles.headerImage}></div>
          
          <div className={styles.headerContent} >
            <div className="flex justify-between items-center relative z-[60]">
              <div>
                <h1 className={styles.headerTitle}>Eriberto Lopez</h1>
                <p className={styles.headerDescription}>
                    Full-stack developer passionate about creating beautiful and functional web experiences.
                </p>
              </div>
              
              <button 
                className={`${styles.mobileMenu}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
            
            <nav className={styles.navContent}>
              <ul className="space-y-2">
                {Object.entries(Sections).map(([key, value]) => {
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
                <a href={MYGITHUB} className="text-neutral-400 hover:text-white transition-colors">
                    <Github size={20} />
                </a>
                <a href={MYTWITTER} className="text-neutral-400 hover:text-white transition-colors">
                    <Twitter size={20} />
                </a>
                <a href={MYLINKEDIN} className="text-neutral-400 hover:text-white transition-colors">
                    <Linkedin size={20} />
                </a>
                <a href={MYEMAIL} className="text-neutral-400 hover:text-white transition-colors">
                    <Mail size={20} />
                </a>
            </div>
          </div>
          {/* Menu Overlay */}
          <div 
            className={`fixed inset-0 bg-black/90 z-50 transition-opacity duration-300 ease-in-out
              ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div 
              className={`fixed inset-0 flex flex-col justify-center items-center transition-transform duration-300 ease-in-out
                ${isMenuOpen ? 'translate-y-0' : '-translate-y-8'}`}
            >
              {/* Navigation Links */}
              <nav className="mb-8">
                <ul className="space-y-6 text-center">
                  {Object.entries(Sections).map(([key, value]) => (
                    <li key={value} className="transform transition-transform duration-200 hover:scale-110">
                      <a 
                        href={value === Sections.Home ? "/" : `/${value.toLowerCase()}`}
                        className="text-2xl text-white hover:text-blue-400 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Social Links */}
              <div className="flex space-x-6">
                <a 
                  href={MYGITHUB} 
                  className="text-neutral-400 hover:text-white transition-colors transform transition-transform duration-200 hover:scale-110"
                >
                  <Github size={24} />
                </a>
                <a 
                  href={MYTWITTER} 
                  className="text-neutral-400 hover:text-white transition-colors transform transition-transform duration-200 hover:scale-110"
                >
                  <Twitter size={24} />
                </a>
                <a 
                  href={MYLINKEDIN} 
                  className="text-neutral-400 hover:text-white transition-colors transform transition-transform duration-200 hover:scale-110"
                >
                  <Linkedin size={24} />
                </a>
                <a 
                  href={MYEMAIL} 
                  className="text-neutral-400 hover:text-white transition-colors transform transition-transform duration-200 hover:scale-110"
                >
                  <Mail size={24} />
                </a>
              </div>
            </div>
          </div>
        </header>
    )
};

const SidebarLayout = (
    {headTitle, currentTheme, onThemeChange, contentImage, children}: 
    {headTitle: string, currentTheme: string, onThemeChange: (t: Sections) => void, contentImage: string, children: React.ReactElement}) => {
  return (
    <div>
        <Head>
            <title>{headTitle}</title>
        </Head>
        <Layout>
            <Container>
                <ContentHeader currentTheme={currentTheme} contentImage={contentImage} />
                <ContentArea>{children}</ContentArea>
            </Container>
        </Layout>
    </div>
  );
};
  
export default SidebarLayout;