import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleDashboardPath } from '../../routes/roleDashboard'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type MenuLink = { label: string; to: string }

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth()
  const [openGroup, setOpenGroup] = useState<'management' | 'tasks'>('management')

  const links = useMemo(() => {
    if (!user) return { dashboard: '/dashboard', management: [] as MenuLink[], tasks: [] as MenuLink[] }

    const management: MenuLink[] = []
    if (user.role === 'admin') {
      management.push(
        { label: 'Users', to: '/users' },
        { label: 'Roles', to: '/roles' },
        { label: 'Clients', to: '/clients' },
        { label: 'POC', to: '/pocs' },
      )
    }

    if (user.role === 'manager' || user.role === 'coordinator') {
      management.push({ label: 'Clients', to: '/clients' }, { label: 'POC', to: '/pocs' })
    }

    const tasks: MenuLink[] = []
    if (['admin', 'manager', 'coordinator', 'expert', 'expertlead'].includes(user.role)) {
      tasks.push({ label: 'All Tasks', to: '/tasks' }, { label: 'Assigned Tasks', to: '/tasks?view=assigned' })
    }

    return {
      dashboard: roleDashboardPath[user.role],
      management,
      tasks,
    }
  }, [user])

  if (!user) return null

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`} aria-label="Role navigation">
        <h2 className="sidebar__title">CRM Suite</h2>

        <NavLink to={links.dashboard} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
          Dashboard
        </NavLink>

        {links.management.length > 0 ? (
          <div>
            <button type="button" className="menu-item sidebar__menu-trigger" onClick={() => setOpenGroup((prev) => (prev === 'management' ? 'tasks' : 'management'))}>
              Management
            </button>
            {openGroup === 'management' ? (
              <div className="submenu">
                {links.management.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `submenu-item ${isActive ? 'submenu-item--active' : ''}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {links.tasks.length > 0 ? (
          <div>
            <button type="button" className="menu-item sidebar__menu-trigger" onClick={() => setOpenGroup((prev) => (prev === 'tasks' ? 'management' : 'tasks'))}>
              Tasks
            </button>
            {openGroup === 'tasks' ? (
              <div className="submenu">
                {links.tasks.map((item) => (
                  <NavLink key={item.label} to={item.to} className={({ isActive }) => `submenu-item ${isActive ? 'submenu-item--active' : ''}`}>
                    {item.label}
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
