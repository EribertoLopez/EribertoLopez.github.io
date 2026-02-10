import Avatar from './avatar'
import DateFormatter from './date-formatter'
import CoverImage from './cover-image'
import Link from 'next/link'
import type Author from '../types/author'
import { Sections } from '../lib/ConfigUtils'

type Props = {
  title: string
  coverImage: string
  date: string
  excerpt: string
  author: Author
  slug: string
  currentTheme: Sections
}

const ProjectPreview = ({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  currentTheme
}: Props) => {
  return (
    <div>
      {/* <div className="mb-5">
        <CoverImage slug={slug} title={title} src={coverImage} isHero={false} currentTheme={currentTheme} />
      </div> */}
      <h3 className="text-3xl mb-3 leading-snug">
        <Link
          as={`/${currentTheme}/${slug}`}
          href={`/${currentTheme}/[slug]`}
          className="hover:underline"
        >
          {<CoverImage slug={slug} title={title} src={coverImage} isHero={false} currentTheme={currentTheme} />}
        </Link>
      </h3>
      {/* <div className="text-lg mb-4">
        <DateFormatter dateString={date} />
      </div>
      <p className="text-lg leading-relaxed mb-4">{excerpt}</p>
      <Avatar name={author.name} picture={author.picture} /> */}
    </div>
  )
}

export default ProjectPreview
