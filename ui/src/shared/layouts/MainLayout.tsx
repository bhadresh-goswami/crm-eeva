import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import CurrentRunningTaskBar from '../components/CurrentRunningTaskBar'
import { useAuth } from '../../context/AuthContext'

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { user } = useAuth()

  return (
    <div className={`app-layout ${isSidebarOpen ? 'app-layout--nav-open' : 'app-layout--nav-closed'}`}>
      <Header onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        {user?.role === 'expert' ? <CurrentRunningTaskBar /> : null}
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
