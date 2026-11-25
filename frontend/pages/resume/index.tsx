import { getAllResumes } from '../../lib/api';
import SidebarLayout from '../../components/SidebarLayout';
import { Sections } from '../../lib/ConfigUtils';
import Post from '../../types/post'
import Intro from '../../components/intro';
import Resume from '../../components/Resume';
import Seo from '../../components/seo';
import { personJsonLd } from '../../lib/jsonld';

type Props = { currentTheme: Sections, allPosts: Post[] }


const Content = ({ currentTheme, allPosts }: Props) => {
  const heroPost = allPosts[0]
  // const morePosts = allPosts.slice(1, allPosts.length).filter((post) =>  post.isPublished === true )

  return (
    <div>
      <Intro currentTheme={currentTheme} currentThemeIntro={''} />
      {heroPost && (
        <Resume />
      )}
    </div>
  )
}

export default function Index({ currentTheme = Sections.Home, allPosts }: Props) {
  const heroPost = allPosts[0]
  // const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )

  return (
    <SidebarLayout
      headTitle={`Resume | Eriberto Lopez`}
      currentTheme={currentTheme}
      onThemeChange={() => {}}
      contentImage={heroPost.coverImage}
    >
      <>
        <Seo
          title="Resume"
          description="Resume of Eriberto Lopez: software engineering experience, skills and education."
          path="/resume"
          type="profile"
          jsonLd={personJsonLd()}
        />
        <Content currentTheme={currentTheme} allPosts={allPosts}/>
      </>
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


