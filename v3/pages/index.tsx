import { useState, useCallback } from 'react'
import { themes, Sections } from '../lib/ConfigUtils'
import SidebarLayout from '../components/SidebarLayout'
import { ExternalLink } from 'lucide-react'
import Post from '../interfaces/post'
import { getAllPosts } from '../lib/api'
import HeroPost from '../components/hero-post'
import Intro from '../components/intro'
import MoreStories from '../components/more-stories'
import HeroProject from '../components/hero-project'

type Props = {
  allPosts: Post[]
}

// 
const Content = ({ currentTheme, allPosts }: { currentTheme: Sections, allPosts: Post[] }) =>  {
  const heroPost = allPosts[0]
  const morePosts = allPosts.slice(1).filter((post) =>  post.isPublished === true )
  // return (
  //   <div className='mx-auto p-8'>
  //     <Intro />
  //     {heroPost && (
  //       <HeroPost
  //         title={heroPost.title}
  //         coverImage={heroPost.coverImage}
  //         date={heroPost.date}
  //         author={heroPost.author}
  //         slug={heroPost.slug}
  //         excerpt={heroPost.excerpt}
  //       />
  //     )}
  //     {morePosts.length > 0 && <MoreStories posts={morePosts} />}
  //   </div>
  // )

  // const sections =  Array(['resume', 'quick description', 'strengths'])
  return (
    <div>
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
        <div className="relative h-[500px] mb-8">
          <img 
            // src="https://images.unsplash.com/photo-1469474968028-56623f02e42e"
            src={themes[currentTheme]}
            alt="Nature landscape"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent rounded-lg"></div>
          <div className="absolute bottom-8 left-8">
            <h2 className="text-4xl font-bold mb-2">Latest Adventure</h2>
            <p className="text-neutral-300">Posted on March 14, 2024</p>
          </div>
        </div>
        {/* {allPosts.map()} */}

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="group cursor-pointer">
              <div className="relative h-64 mb-4">
                <img 
                  src={`https://images.unsplash.com/photo-${item + 1}?auto=format&fit=crop&w=800`}
                  alt={`Project ${item}`}
                  className="w-full h-full object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                />
                <div className="absolute top-4 right-4 bg-neutral-900/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={16} />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Project Title {item}</h3>
              <p className="text-neutral-400">A brief description of the project and its key features.</p>
            </div>
          ))}
        </div>

        <div className="prose prose-invert max-w-none">
          <h2 className="text-3xl font-bold mb-6">Latest Posts</h2>
          {[1, 2, 3].map((post) => (
            <article key={post} className="mb-12">
              <h3 className="text-2xl font-semibold mb-4">Blog Post Title {post}</h3>
              <p className="text-neutral-400 mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
                incididunt ut labore et dolore magna aliqua.
              </p>
              <a href="#" className="text-blue-400 hover:text-blue-300 inline-flex items-center">
                Read More <ExternalLink size={16} className="ml-2" />
              </a>
            </article>
          ))}
        </div> */}
    </div>
  );
}



export default function Index({ allPosts }: Props) {
  const [currentTheme, setCurrentTheme] = useState<Sections>(Sections.Home);
  const handleThemeChange = useCallback((theme: Sections) => {
    setCurrentTheme(themes[theme]);
  }, [themes])

  return (
    <SidebarLayout
      headTitle={`Home | Eriberto Lopez`}
      currentTheme={currentTheme}
      onThemeChange={handleThemeChange}
      contentImage={undefined} // TODO: fix :(
    >
      <Content currentTheme={currentTheme} allPosts={allPosts} />
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
