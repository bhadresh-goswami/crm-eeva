import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={`app-layout ${isSidebarOpen ? 'app-layout--nav-open' : 'app-layout--nav-closed'}`}>
      <Header onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
