import { Sections } from "../lib/ConfigUtils"


const description: string = "I\'m Eri Lopez welcome 👋. My interests are personal development, computational biology, laser cutters, photography, acrylic pour painting, programming, and automation. I hope you find something helpful or inspiring. "

const Intro = ({ currentTheme, currentThemeIntro = description }: {currentTheme: Sections, currentThemeIntro: string}) => {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        {currentTheme}
      </h1>
      <h4 className="text-center md:text-left text-lg mt-5 md:pl-8">
        {currentThemeIntro}
        <a
          href="https://www.linkedin.com/in/eribertolopez/"
          className="underline hover:text-blue-600 duration-200 transition-colors"
        >
          Let&apos;s connect!
        </a>{' '}
      </h4>
    </section>
  )
}

export default Intro
