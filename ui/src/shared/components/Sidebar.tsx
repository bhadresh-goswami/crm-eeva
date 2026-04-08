import { NavLink } from 'react-router-dom'
import { useAuth, type UserRole } from '../../context/AuthContext'

type SidebarItem = {
  label: string
  to: string
}

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'

const roleNavigation: Record<UserRole, SidebarItem[]> = {
  admin: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Users', to: '/users' },
    { label: 'Roles', to: '/roles' },
    { label: 'Client', to: '/clients' },
    { label: 'POC', to: '/pocs' },
  ],
  manager: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Tasks', to: '/tasks' },
    { label: 'Client', to: '/clients' },
    { label: 'POC', to: '/pocs' },
  ],
  coordinator: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Tasks', to: '/tasks' },
    { label: 'Client', to: '/clients' },
  ],
  expert: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Tasks', to: '/tasks' },
  ],
  expertlead: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Tasks', to: '/tasks' }
  ],
}

const Sidebar = () => {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <aside className="sidebar" aria-label="Role navigation">
      <h2 className="sidebar__title">CRM</h2>
      <nav>
        <ul className="sidebar__list">
          {roleNavigation[user.role].map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navClassName} end={item.to === '/dashboard'}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
