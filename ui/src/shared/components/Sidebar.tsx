import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleDashboardPath } from '../../routes/roleDashboard'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type MenuLink = { label: string; to: string; icon?: string }

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth()
  const [openGroup, setOpenGroup] = useState<'management' | 'tasks'>('management')

  const links = useMemo(() => {
    if (!user) return { dashboard: '/dashboard', management: [] as MenuLink[], tasks: [] as MenuLink[], managerMenu: [] as MenuLink[] }

    const management: MenuLink[] = []
    if (user.role === 'admin') {
      management.push(
        { label: 'Users', to: '/users', icon: '👥' },
        { label: 'Roles', to: '/roles', icon: '🛡️' },
        { label: 'Clients', to: '/clients', icon: '🏢' },
        { label: 'POC', to: '/pocs', icon: '📇' },
        { label: 'Invoices', to: '/invoices', icon: '🧾' },
      )
    }

    if (user.role === 'manager' || user.role === 'coordinator') {
      management.push({ label: 'Clients', to: '/clients', icon: '🏢' }, { label: 'POC', to: '/pocs', icon: '📇' })
      if (user.role === 'manager') {
        management.push({ label: 'Invoices', to: '/invoices', icon: '🧾' })
      }
    }

    const tasks: MenuLink[] = []
    if (['admin', 'manager', 'coordinator', 'expert', 'expertlead'].includes(user.role)) {
      tasks.push({ label: 'All Tasks', to: '/tasks', icon: '📝' }, { label: 'Assigned Tasks', to: '/tasks?view=assigned', icon: '📌' })
    }

    const managerMenu: MenuLink[] =
      user.role === 'manager'
        ? [
            { label: 'Dashboard', to: roleDashboardPath.manager, icon: '📊' },
            { label: 'Tasks', to: '/tasks', icon: '📝' },
            { label: 'Price Update', to: '/tasks/bulk-price', icon: '💰' },
            { label: 'Client', to: '/clients', icon: '🏢' },
            { label: 'POC', to: '/pocs', icon: '📇' },
            { label: 'Candidate', to: '/candidates', icon: '🧑‍💼' },
            { label: 'Invoices', to: '/invoices', icon: '🧾' },
          ]
        : []

    return {
      dashboard: roleDashboardPath[user.role],
      management,
      tasks,
      managerMenu,
    }
  }, [user])

  if (!user) return null

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`} aria-label="Role navigation">
        <h2 className="sidebar__title">CRM Suite</h2>

        {user.role === 'manager' ? (
          links.managerMenu.map((item) => (
            <NavLink key={item.label} to={item.to} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
              {item.icon ? <span className="menu-icon">{item.icon}</span> : null}
              <span className="menu-label">{item.label}</span>
            </NavLink>
          ))
        ) : (
          <NavLink to={links.dashboard} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
            <span className="menu-icon">📊</span>
            <span className="menu-label">Dashboard</span>
          </NavLink>
        )}

        {user.role !== 'manager' && links.management.length > 0 ? (
          <div>
            <button type="button" className="menu-item sidebar__menu-trigger" onClick={() => setOpenGroup((prev) => (prev === 'management' ? 'tasks' : 'management'))}>
              <span className="menu-icon">🧰</span>
              <span className="menu-label">Management</span>
            </button>
            {openGroup === 'management' ? (
              <div className="submenu">
                {links.management.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `submenu-item ${isActive ? 'submenu-item--active' : ''}`}>
                    {item.icon ? `${item.icon} ` : ''}{item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {user.role !== 'manager' && links.tasks.length > 0 ? (
          <div>
            <button type="button" className="menu-item sidebar__menu-trigger" onClick={() => setOpenGroup((prev) => (prev === 'tasks' ? 'management' : 'tasks'))}>
              <span className="menu-icon">🗂️</span>
              <span className="menu-label">Tasks</span>
            </button>
            {openGroup === 'tasks' ? (
              <div className="submenu">
                {links.tasks.map((item) => (
                  <NavLink key={item.label} to={item.to} className={({ isActive }) => `submenu-item ${isActive ? 'submenu-item--active' : ''}`}>
                    {item.icon ? `${item.icon} ` : ''}{item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>
      {isOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" /> : null}
    </>
  )
}

export default Sidebar
