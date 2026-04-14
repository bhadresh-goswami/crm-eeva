import { NavLink } from 'react-router-dom'
import { useAuth, type UserRole } from '../../context/AuthContext'
import { roleDashboardPath } from '../../routes/roleDashboard'

type SidebarItem = {
  label: string
  to: string
  section: 'Navigation' | 'Management'
  icon: string
}

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'

const roleNavigation: Record<UserRole, SidebarItem[]> = {
  admin: [
    { label: 'Dashboard', to: roleDashboardPath.admin, section: 'Navigation', icon: '◻' },
    { label: 'Users', to: '/users', section: 'Management', icon: '◉' },
    { label: 'Roles', to: '/roles', section: 'Management', icon: '◎' },
    { label: 'Client', to: '/clients', section: 'Management', icon: '▣' },
    { label: 'POC', to: '/pocs', section: 'Management', icon: '◌' },
    { label: 'Candidate', to: '/candidates', section: 'Management', icon: '◇' },
  ],
  manager: [
    { label: 'Dashboard', to: roleDashboardPath.manager, section: 'Navigation', icon: '◻' },
    { label: 'Tasks', to: '/tasks', section: 'Management', icon: '◉' },
    { label: 'Client', to: '/clients', section: 'Management', icon: '▣' },
    { label: 'POC', to: '/pocs', section: 'Management', icon: '◌' },
    { label: 'Candidate', to: '/candidates', section: 'Management', icon: '◇' },
  ],
  coordinator: [
    { label: 'Dashboard', to: roleDashboardPath.coordinator, section: 'Navigation', icon: '◻' },
    { label: 'Tasks', to: '/tasks', section: 'Management', icon: '◉' },
    { label: 'Candidate', to: '/candidates', section: 'Management', icon: '◇' },
  ],
  expert: [
    { label: 'Dashboard', to: roleDashboardPath.expert, section: 'Navigation', icon: '◻' },
    { label: 'Tasks', to: '/tasks', section: 'Management', icon: '◉' },
  ],
  expertlead: [
    { label: 'Dashboard', to: roleDashboardPath.expertlead, section: 'Navigation', icon: '◻' },
    { label: 'Tasks', to: '/tasks', section: 'Management', icon: '◉' },
  ],
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth()

  if (!user) return null

  const items = roleNavigation[user.role]

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`} aria-label="Role navigation">
        <h2 className="sidebar__title">CRM Suite</h2>
        {(['Navigation', 'Management'] as const).map((section) => (
          <div className="sidebar__section" key={section}>
            <p className="sidebar__section-label">{section}</p>
            <ul className="sidebar__list">
              {items
                .filter((item) => item.section === section)
                .map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={navClassName}
                      end={item.to.includes('/dashboard')}
                    >
                      <span className="sidebar__icon">{item.icon}</span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </aside>
      {isOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" /> : null}
    </>
  )
}

export default Sidebar
