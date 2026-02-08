import { AppProps } from 'next/app'
import '../styles/index.css'
import ChatWidget from '../components/ChatWidget'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <ChatWidget />
    </>
  )
}
