import cn from 'classnames'
import Link from 'next/link'
import Image from 'next/image'
import { Sections } from '../lib/ConfigUtils'

type Props = {
  title: string
  src: string
  slug?: string
  isHero: boolean
  currentTheme: Sections
}

const CoverImage = ({ title, src, slug, isHero, currentTheme }: Props) => {
  const image = isHero ? (
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn('shadow-sm w-full h-full object-cover object-center', {
        'hover:shadow-lg transition-shadow duration-200': slug,
      })}
      fill={true}
      sizes="100vw"
      style={{ objectPosition: currentTheme === Sections.Resume ? 'center 20%' : 'center 40%' }} // Adjust percentage to control crop position
    />

  ) : (
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn('shadow-sm w-full', {
        'hover:shadow-lg transition-shadow duration-200': slug,
      })}
      width={1300}
      height={630}
    />
  );
  const asPath: string = (currentTheme ? `/${currentTheme.toLowerCase()}` : '').concat(`/${slug}`) 
  const hrefPath: string = (currentTheme ? `/${currentTheme.toLowerCase()}` : '').concat(`/[slug]`) 
  return (
    <div className={isHero ? "relative h-full" : "sm:mx-0"}>
      {slug ? (
        <Link as={asPath} href={hrefPath} aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  )
}

export default CoverImage
