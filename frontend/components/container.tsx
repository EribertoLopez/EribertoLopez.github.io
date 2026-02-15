
type Props = {
  children?: React.ReactNode
}

const Container = ({ children }: Props) => {
  return <div id='mycontainer'>{children}</div>
}

export default Container
