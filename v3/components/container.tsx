type Props = {
  children?: React.ReactNode
}

const Container = ({ children }: Props) => {
  // return <div id='mycontainer'>{children}</div>
  return <div 
    id='mycontainer' 
    className="container mx-auto px-5"
    style={{"paddingLeft": '30%'}}
  >
    {children}
  </div>
}

export default Container
