import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // req.post('category/create',{
    //   body:{
    //     categoryName:'',
    //     description:''
    //   }
    // }).then(v=>{
    //   v.categoryName
    // })
  }, [])
  return (
    <div>
      <div>Call API with type safety</div>
    </div>
  )
}

export default App
