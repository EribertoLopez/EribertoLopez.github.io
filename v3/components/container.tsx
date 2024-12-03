import styles from './Header.module.css';

type Props = {
  children?: React.ReactNode
}

const Container = ({ children }: Props) => {
  // return <div id='mycontainer'>{children}</div>
  return <div 
    id='mycontainer'
  >
    {children}
  </div>
}

export default Container
