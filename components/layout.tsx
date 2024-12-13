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
  return (
    <div >
      <Meta />
      <div 
        className="min-h-screen text-white"
        style={{
          marginInline: 'auto'
        }}
      >
        {/* <NavBar /> */}
        {/* <Alert preview={preview} /> */}
        <main>{children}</main>
      </div>
      {/* <Footer /> */}
    </div>
  )
}

export default Layout
