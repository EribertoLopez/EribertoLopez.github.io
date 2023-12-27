import { CMS_NAME } from '../lib/constants'

const Intro = () => {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        Blog.
      </h1>
      <h4 className="text-center md:text-left text-lg mt-5 md:pl-8">
        I'm Eri Lopez welcome to my blog 👋. 
        My interests are personal development, computational biology, laser cutters, photography, acrylic pour painting, programming, and automation.

        I hope you find something helpful or inspiring. {' '}
        <a
          href="https://www.linkedin.com/in/eribertolopez/"
          className="underline hover:text-blue-600 duration-200 transition-colors"
        >
          Let's connect!
        </a>{' '}
         {/* {CMS_NAME}. */}
      </h4>
    </section>
  )
}

export default Intro
