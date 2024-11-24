import Head from 'next/head'
import myImage from '../public/favicon/acryclic_cells_rainbow_zoom_in.jpeg';

const Meta = () => {
  return (
    <Head>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/IBelieveICanShibe_edited_192x192.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/IBelieveICanShibe_edited_32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/IBelieveICanShibe_edited_16x16.png"
      />
      <link rel="manifest" href="/favicon/site.webmanifest" />
      <link
        rel="mask-icon"
        href="/favicon/safari-pinned-tab.svg"
        color="#000000"
      />
      <link rel="shortcut icon" href="/favicon/IBelieveICanShibe_edited_50x50.png" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#000" />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      {/* <meta
        name="description"
        content={`A statically generated blog example using Next.js and ${CMS_NAME}.`}
      /> */}
      <meta property="og:image" content='/favicon/acryclic_cells_rainbow_zoom_in.jpeg' />
      {/* <meta property="og:image" content={myImage.src} /> */}
    </Head>
  )
}

export default Meta
