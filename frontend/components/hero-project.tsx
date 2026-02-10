import { useState } from 'react'
import CoverImage from './cover-image'
import type Author from '../types/author'
import { Sections } from '../lib/ConfigUtils'
import Link from 'next/link'

type Props = {
  title: string
  coverImage: string
  date: string
  excerpt: string
  author: Author
  slug: string
  currentTheme: Sections
}

const HeroProject = ({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  currentTheme
}: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const asPath: string = (currentTheme ? `/${currentTheme.toLowerCase()}` : '').concat(`/${slug}`) 
  const hrefPath: string = (currentTheme ? `/${currentTheme.toLowerCase()}` : '').concat(`/[slug]`) 

  return (
    <section className="group">
      <div 
        className="relative mb-8 md:mb-16 h-[500px] overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20 z-10" />
        
        {/* Image container with zoom effect */}
        <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-105">
          <CoverImage 
            title={title} 
            src={coverImage} 
            slug={slug} 
            currentTheme={currentTheme} 
            isHero 
          />
        </div>

        {/* Content wrapper */}
        <Link 
          as={asPath}
          href={hrefPath}
          className="absolute inset-0 z-20 flex flex-col justify-end p-8"
        >
          {/* Hover content */}
          <div 
            className={`transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div 
              className={`transform transition-transform duration-300 ${
                isHovered ? 'translate-y-0' : 'translate-y-4'
              }`}
            >
              <h3 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                {title}
              </h3>
              <p className={`text-lg leading-relaxed ${'text-gray-300'
                // currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-100'
              }`}>
                {excerpt}
              </p>
            </div>
          </div>

          {/* Default title - visible when not hovered */}
          <div 
            className={`transition-opacity duration-300 ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <h3 className="text-4xl lg:text-5xl font-bold text-white">
              {title}
            </h3>
          </div>
        </Link>
      </div>
    </section>
  )
}

export default HeroProject