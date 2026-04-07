import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

const AppLayout = () => {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
