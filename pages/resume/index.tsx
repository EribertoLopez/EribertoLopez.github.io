import { getAllResumes } from '../../lib/api';
import SidebarLayout from '../../components/SidebarLayout';
import { Sections } from '../../lib/ConfigUtils';
import Post from '../../interfaces/post'
import Intro from '../../components/intro';
import Resume from '../../components/Resume';

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


