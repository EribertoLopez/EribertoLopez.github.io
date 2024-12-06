import cn from 'classnames'
import Link from 'next/link'
import Image from 'next/image'

type Props = {
  title: string
  src: string
  slug?: string
  isHero: boolean
}

const CoverImage = ({ title, src, slug, isHero }: Props) => {
  const image = isHero ? (
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn('shadow-sm w-full h-full object-cover object-center', {
        'hover:shadow-lg transition-shadow duration-200': slug,
      })}
      fill={true}
      sizes="100vw"
      style={{ objectPosition: 'center 40%' }} // Adjust percentage to control crop position
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
  return (
    <div className={isHero ? "relative h-full" : "sm:mx-0"}>
      {slug ? (
        <Link as={`/posts/${slug}`} href="/posts/[slug]" aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  )
}

export default CoverImage
