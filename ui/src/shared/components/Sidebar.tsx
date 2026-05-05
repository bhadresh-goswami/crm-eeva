import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { roleDashboardPath } from '../../routes/roleDashboard'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type IconName = 'dashboard' | 'tasks' | 'payment' | 'invoices' | 'reports' | 'clients' | 'poc' | 'candidates' | 'users' | 'settings'
type MenuItem = { label: string; to: string; icon: IconName }
type MenuSection = { title: string; items: MenuItem[] }

const iconPaths: Record<IconName, string> = {
  dashboard: 'M3 12l9-8 9 8M5 10v10h14V10',
  tasks: 'M4 6h16M4 12h16M4 18h16',
  payment: 'M3 7h18v10H3zM3 11h18M7 15h4',
  invoices: 'M7 3h10l4 4v14H7zM17 3v4h4M9 12h8M9 16h8',
  reports: 'M5 17V7M10 17V11M15 17V9M20 17V5',
  clients: 'M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  poc: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87',
  candidates: 'M16 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H4a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.2a2 2 0 0 1-4 0V21a1.7 1.7 0 0 0-1.4-1.6 1.7 1.7 0 0 0-1.6.3l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2.8a2 2 0 0 1 0-4H3a1.7 1.7 0 0 0 1.6-1.4 1.7 1.7 0 0 0-.3-1.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.8a2 2 0 0 1 4 0V3a1.7 1.7 0 0 0 1.4 1.6 1.7 1.7 0 0 0 1.6-.3l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h.2a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1.4z',
}

const Icon = ({ name }: { name: IconName }) => (
  <svg className="menu-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={iconPaths[name]} />
  </svg>
)

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth()

  const sections = useMemo<MenuSection[]>(() => {
    if (!user) return []

    if (user.role === 'manager') {
      return [
        {
          title: 'Main',
          items: [
            { label: 'Dashboard', to: roleDashboardPath.manager, icon: 'dashboard' },
            { label: 'Tasks', to: '/tasks', icon: 'tasks' },
          ],
        },
        {
          title: 'Finance',
          items: [
            { label: 'Payment Correction', to: '/tasks/payment-correction', icon: 'payment' },
            { label: 'Invoices', to: '/invoices', icon: 'invoices' },
          ],
        },
        {
          title: 'Reports',
          items: [{ label: 'Task Reports', to: '/reports/tasks', icon: 'reports' }, { label: 'Candidate Report', to: '/reports/candidates', icon: 'reports' }],
        },
        {
          title: 'CRM',
          items: [
            { label: 'Clients', to: '/clients', icon: 'clients' },
            { label: 'POC', to: '/pocs', icon: 'poc' },
            { label: 'Candidates', to: '/candidates', icon: 'candidates' },
          ],
        },
      ]
    }

    if (user.role === 'admin') {
      return [
        {
          title: 'Main',
          items: [
            { label: 'Dashboard', to: roleDashboardPath.admin, icon: 'dashboard' },
            { label: 'Tasks', to: '/tasks', icon: 'tasks' },
          ],
        },
        {
          title: 'Finance',
          items: [
            { label: 'Payment Correction', to: '/tasks/payment-correction', icon: 'payment' },
            { label: 'Invoices', to: '/invoices', icon: 'invoices' },
          ],
        },
        {
          title: 'Reports',
          items: [{ label: 'Task Reports', to: '/reports/tasks', icon: 'reports' }, { label: 'Candidate Report', to: '/reports/candidates', icon: 'reports' }],
        },
        {
          title: 'CRM',
          items: [
            { label: 'Clients', to: '/clients', icon: 'clients' },
            { label: 'POC', to: '/pocs', icon: 'poc' },
            { label: 'Candidates', to: '/candidates', icon: 'candidates' },
          ],
        },
        {
          title: 'System',
          items: [
            { label: 'Users', to: '/users', icon: 'users' },
            { label: 'Settings', to: '/roles', icon: 'settings' },
          ],
        },
      ]
    }

    const sections: MenuSection[] = [
      {
        title: 'Main',
        items: [
          { label: 'Dashboard', to: roleDashboardPath[user.role], icon: 'dashboard' },
          { label: 'Tasks', to: '/tasks', icon: 'tasks' },
        ],
      },
    ]

    if (user.role !== 'expert') {
      sections.push({
        title: 'CRM',
        items: [
          { label: 'Clients', to: '/clients', icon: 'clients' },
          { label: 'POC', to: '/pocs', icon: 'poc' },
          { label: 'Candidates', to: '/candidates', icon: 'candidates' },
        ],
      })
    }

    sections.push({
      title: 'Reports',
      items: [{ label: 'Task Reports', to: '/reports/tasks', icon: 'reports' }, { label: 'Candidate Report', to: '/reports/candidates', icon: 'reports' }],
    })

    return sections
  }, [user])

  if (!user) return null

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`} aria-label="Role navigation">
        <h2 className="sidebar__title">CRM Suite</h2>

        {sections.map((section) => (
          <section key={section.title} className="sidebar__group">
            <h3 className="sidebar__group-title">{section.title}</h3>
            <div className="sidebar__group-links">
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
                  <Icon name={item.icon} />
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </aside>
      {isOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" /> : null}
    </>
  )
}

export default Sidebar
