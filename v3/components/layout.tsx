import LandingPage from './LandingPage'
import NavBar from './NavBar'
// import Alert from './alert'
import Footer from './footer'
import Meta from './meta'

type Props = {
  preview?: boolean
  children: React.ReactNode
}

const Layout = ({ preview, children }: Props) => {
  console.log("Layout.tsx: preview: ", preview);
  return (
    <div >
      <Meta />
      <div className="min-h-screen">
        {/* <NavBar /> */}
        {/* <Alert preview={preview} /> */}
        <main>{children}</main>
      </div>
      {/* <Footer /> */}
    </div>
  )
}

export default Layout
