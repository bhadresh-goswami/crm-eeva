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
    { label: 'Client CRM', to: '/clients' },
    { label: 'Candidates', to: '/candidates' },
    { label: 'POCs', to: '/pocs' },
    { label: 'Roles', to: '/roles' },
  ],
  manager: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Tasks', to: '/tasks' },
    { label: 'Client CRM', to: '/clients' },
    { label: 'Candidates', to: '/candidates' },
    { label: 'POCs', to: '/pocs' },
  ],
  coordinator: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Tasks', to: '/tasks' },
    { label: 'Client CRM', to: '/clients' },
    { label: 'Candidates', to: '/candidates' },
    { label: 'POCs', to: '/pocs' },
  ],
  expert: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Tasks', to: '/tasks' },
  ],
  expertlead: [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'My Tasks', to: '/tasks' },
    { label: 'Client CRM', to: '/clients' },
    { label: 'POCs', to: '/pocs' },
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
