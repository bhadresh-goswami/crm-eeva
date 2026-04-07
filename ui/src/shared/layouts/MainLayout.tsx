import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const MainLayout = () => {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-shell__main">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
