import Container from '../../components/container'
import Layout from '../../components/layout'

import Head from 'next/head'

import myImage from "../../public/favicon/IBelieveICanShibe_edited_50x50.png";

import styles from './resume.module.css'
import Image from "next/image";
import { getAllResumes } from '../../lib/api';
// import { Props } from 'next/script';
import { useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { Sections } from '../../lib/ConfigUtils';
import Post from '../../interfaces/post'
import Intro from '../../components/intro';
import { Github, Linkedin, Globe } from 'lucide-react'
import { resumeData } from './resumeConfig';
import Resume from '../../components/Resume';

type Props = { currentTheme: Sections, allPosts: Post[] }

// type Props = {
//   post: ProjectType
//   morePosts: ProjectType[]
//   preview?: boolean
//   currentTheme: Sections
// }


const Content = ({ currentTheme, allPosts }: Props) => {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1, allPosts.length).filter((post) =>  post.isPublished === true )

  return (
    <div>
      <Intro currentTheme={currentTheme}/>
      {heroPost && (
        <Resume />
      )}

    </div>
  )
}

export default function Index({ allPosts }: Props) {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )
  const [currentTheme, setCurr_entTheme] = useState<Sections>(Sections.Resume);
  // const handleThemeChange = useCallback((theme: Sections) => {
  //   setCurrentTheme(themes[theme]);
  // }, [themes])

  return (
    <SidebarLayout
      headTitle={`Latest | Eriberto Lopez`}
      currentTheme={currentTheme}
      onThemeChange={() => {}}
      contentImage={heroPost.coverImage}
    >
      <Content currentTheme={currentTheme} allPosts={allPosts}/>
    </SidebarLayout>
  )

}

export const getStaticProps = async () => {
  const allPosts = getAllResumes([
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
  ])

  return {
    props: { allPosts },
  }
}


