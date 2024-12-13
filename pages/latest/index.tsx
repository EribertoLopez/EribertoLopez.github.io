import Container from '../../components/container'
import MoreStories from '../../components/more-stories'
import HeroPost from '../../components/hero-post'
import Intro from '../../components/intro'
import Layout from '../../components/layout'
import { getAllPosts } from '../../lib/api'
import Head from 'next/head'
import Post from '../../interfaces/post'
import { useState, useCallback } from 'react'
import SidebarLayout from '../../components/SidebarLayout'
import { Sections, themes } from '../../lib/ConfigUtils'

type Props = {
  allPosts: Post[]
}
const Content = ({ currentTheme, allPosts }: { currentTheme: Sections, allPosts: Post[] }) => {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1, allPosts.length).filter((post) =>  post.isPublished === true )
  const description: string = 'Here are some of the latest posts from my blog. '
  return (
    <div>
      <Intro currentTheme={currentTheme} currentThemeIntro={description}/>
      {heroPost && (
        <HeroPost
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          date={heroPost.date}
          author={heroPost.author}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          currentTheme={currentTheme}
        />
      )}
      {morePosts.length > 0 && <MoreStories posts={morePosts} currentTheme={currentTheme} />}
    </div>
  )
}

export default function Index({ allPosts }: Props) {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )
  const [currentTheme, setCurr_entTheme] = useState<Sections>(Sections.Posts);
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
  const allPosts = getAllPosts([
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
