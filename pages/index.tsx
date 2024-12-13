import { useState, useCallback } from 'react'
import { themes, Sections } from '../lib/ConfigUtils'
import SidebarLayout from '../components/SidebarLayout'
import Post from '../interfaces/post'
import Project from '../interfaces/project'
import { getAllPosts, getAllProjects, getAllResumes } from '../lib/api'
import Intro from '../components/intro'
import HeroProject from '../components/hero-project'
import ResumeHero from '../components/hero-resume'

type Props = {
  allPosts: Post[]
  allResumes: Post[],
  allProjects: Project[]
}

const Content = ({ currentTheme, allPosts, allResumes, allProjects }: { currentTheme: Sections, allPosts: Post[], allResumes: Post[], allProjects: Project[] }) =>  {
  const heroProj = allProjects[0]
  const heroResume = allResumes[0]
  const heroPost = allPosts[0]
  const description: string = "I\'m Eri Lopez welcome 👋. My interests are software development, synthetic & computational biology, laser cutters, photography, acrylic pour painting, and automation. I hope you find something helpful or inspiring. "

  return (
    <div>
        <Intro currentTheme={currentTheme} currentThemeIntro={description} />
        <HeroProject // testing only - doesn't create the  link path to the resource, b/c its tied to the currentTheme
          key={heroPost.slug}
          title={heroPost.title}
          coverImage={heroPost.coverImage}
          // coverImage={heroPost.coverImage}
          date={heroPost.date}
          author={heroPost.author}
          slug={heroPost.slug}
          excerpt={heroPost.excerpt}
          currentTheme={Sections.Posts} // can hardcode the currentTheme to render post from other section and create the correct links
        />
        <HeroProject // testing only - doesn't create the  link path to the resource, b/c its tied to the currentTheme
          key={heroProj.slug}
          title={heroProj.title}
          coverImage={heroProj.coverImage}
          // coverImage={heroPost.coverImage}
          date={heroProj.date}
          author={heroProj.author}
          slug={heroProj.slug}
          excerpt={heroProj.excerpt}
          currentTheme={Sections.Projects} // can hardcode the currentTheme to render post from other section and create the correct links
        />
        <ResumeHero // testing only - doesn't create the  link path to the resource, b/c its tied to the currentTheme
          key={heroResume.slug}
          title={heroResume.title}
          coverImage={heroResume.coverImage}
          // coverImage={heroPost.coverImage}
          date={heroResume.date}
          author={heroResume.author}
          slug={heroResume.slug}
          // slug={heroResume.slug}
          excerpt={heroResume.excerpt}
          currentTheme={Sections.Resume} // can hardcode the currentTheme to render post from other section and create the correct links
        />
    </div>
  );
}



export default function Index({ allPosts, allResumes, allProjects }: Props) {

  return (
    <SidebarLayout
      headTitle={`Home | Eriberto Lopez`}
      currentTheme={Sections.Home}
      onThemeChange={() => {}}
      contentImage={undefined} // TODO: fix :(
    >
      <Content currentTheme={Sections.Home} allPosts={allPosts} allResumes={allResumes} allProjects={allProjects}/>
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
  const allResumes = getAllResumes([
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
  ])
  const allProjects = getAllProjects([
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
    'isPublished',
  ])
  return {
    props: { allPosts, allResumes, allProjects },
  }
}
