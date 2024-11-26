import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import Link from 'next/link';
import { Sections, themes } from '../lib/ConfigUtils';
import Head from 'next/head';
import ContentArea from './ContentArea';
import Sidebar from './Sidebar';
import Container from './container';
import Layout from './layout';


const SidebarLayout = ({headTitle, currentTheme, onThemeChange, children}: {headTitle: string, currentTheme: string, onThemeChange: (t: Sections) => void, children: React.ReactElement}) => {
  return (
    <div>
        <Head>
            <title>{headTitle}</title>
        </Head>
        <Sidebar currentTheme={themes[currentTheme]} onThemeChange={onThemeChange} />
        <Layout>
            <Container>
                {/* TODO: check if correct pattern */}
                {children}
                {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
                {/* <LandingPage /> */}
                {/* <ContentArea currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
            </Container>
        </Layout>
  </div>
  );
};

export default SidebarLayout;