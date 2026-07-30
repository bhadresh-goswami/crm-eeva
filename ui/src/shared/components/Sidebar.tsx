import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [isReportsOpen, setIsReportsOpen] = useState(false)
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false)
  const reportsRef = useRef<HTMLDivElement | null>(null)
  const manageRef = useRef<HTMLDivElement | null>(null)
  const invoiceRef = useRef<HTMLDivElement | null>(null)

  const sections = useMemo<MenuSection[]>(() => {
    if (!user) return []

    if (user.role === 'manager') {
      return [
        { title: 'Main', items: [
          { label: 'Dashboard', to: roleDashboardPath.manager, icon: 'dashboard' },
          { label: 'Tasks', to: '/tasks', icon: 'tasks' },
          { label: 'Invoice', to: '/invoices', icon: 'invoices' },
          { label: 'Payment Correction', to: '/tasks/payment-correction', icon: 'payment' },
        ] },
        { title: 'Manage', items: [
          { label: 'Client', to: '/clients', icon: 'clients' },
          { label: 'POC', to: '/pocs', icon: 'poc' },
          { label: 'Candidates', to: '/candidates', icon: 'candidates' },
        ] },
        { title: 'Reports', items: [
          { label: 'Team Workload', to: '/manager/reports/team-workload', icon: 'reports' },
          { label: 'Pending Payments Report', to: '/manager/reports/pending-payments', icon: 'reports' },
          { label: 'Feedback Pending Report', to: '/reports/feedback-pending', icon: 'reports' },
          { label: 'Tech Vs Tasks', to: '/reports/tech-vs-tasks', icon: 'reports' },
          { label: 'Tasks Summary', to: '/reports/tasks-summary', icon: 'reports' },
          { label: 'Feedback Report', to: '/reports/feedback-report', icon: 'reports' },
          { label: 'Feedback For Client', to: '/reports/feedback-for-client', icon: 'reports' },
          { label: 'Candidate Performance Report', to: '/reports/candidate-performance', icon: 'reports' },
          { label: "Today's Expert Availability Report", to: '/reports/expert-availability', icon: 'reports' },
        ] },
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
          items: [{ label: 'Task Reports', to: '/reports/tasks', icon: 'reports' }, { label: 'Candidate Report', to: '/reports/candidates', icon: 'reports' }, { label: 'Feedback Report', to: '/reports/feedback', icon: 'reports' }, { label: "Today's Expert Availability Report", to: '/reports/expert-availability', icon: 'reports' }],
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
          ...(['expert', 'technical expert', 'expertlead', 'technical lead'].includes(user.role)
            ? [{ label: 'Task Feedback', to: '/tasks/expert-reports', icon: 'tasks' as const }]
            : []),
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
      items: [{ label: 'Task Reports', to: '/reports/tasks', icon: 'reports' }, { label: 'Candidate Report', to: '/reports/candidates', icon: 'reports' }, { label: 'Feedback Report', to: '/reports/feedback', icon: 'reports' }, { label: "Today's Expert Availability Report", to: '/reports/expert-availability', icon: 'reports' }],
    })

    return sections
  }, [user])

  if (!user) return null
  const allItems = sections.flatMap((section) => section.items)
  const reportsItems = allItems.filter((item) => item.to.startsWith('/reports') || item.to.startsWith('/manager/reports'))
  const orderedLabels = user.role === 'manager' ? ['Dashboard', 'Tasks', 'Invoice'] : ['Dashboard', 'Tasks', 'Task Feedback', 'Payment Correction', 'Invoices', 'Clients', 'POC', 'Candidates']
  const manageItems = user.role === 'manager' ? allItems.filter((item) => ['Client', 'POC', 'Candidates'].includes(item.label)) : []
  const invoiceItems = user.role === 'manager' ? allItems.filter((item) => ['Payment Correction', 'Invoice'].includes(item.label)) : []
  const primaryItems = orderedLabels
    .map((label) => allItems.find((item) => item.label === label))
    .filter((item): item is MenuItem => Boolean(item))

  const isReportsActive = reportsItems.some((item) => location.pathname === item.to)
  const isManageActive = manageItems.some((item) => location.pathname === item.to)
  const isInvoiceActive = invoiceItems.some((item) => location.pathname === item.to)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reportsRef.current && !reportsRef.current.contains(event.target as Node)) setIsReportsOpen(false)
      if (manageRef.current && !manageRef.current.contains(event.target as Node)) setIsManageOpen(false)
      if (invoiceRef.current && !invoiceRef.current.contains(event.target as Node)) setIsInvoiceOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setIsReportsOpen(false)
    setIsManageOpen(false)
    setIsInvoiceOpen(false)
    onClose()
  }, [location.pathname, onClose])


  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.modal-overlay, .modal.d-block, .invoice-modal-backdrop, .alert-modal-backdrop')) {
        setIsReportsOpen(false)
        setIsManageOpen(false)
        setIsInvoiceOpen(false)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <nav className="top-nav" aria-label="Role navigation">
        <div className="top-nav__scroller">
          {primaryItems.filter((item) => item.label !== 'Invoice').map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
              <Icon name={item.icon} />
              <span className="menu-label">{item.label}</span>
            </NavLink>
          ))}
          {invoiceItems.length > 0 ? (
            <div ref={invoiceRef} className="top-nav__dropdown" onMouseEnter={() => setIsInvoiceOpen(true)} onMouseLeave={() => setIsInvoiceOpen(false)}>
              <button type="button" className={`menu-item top-nav__dropdown-trigger ${isInvoiceActive ? 'sidebar__link--active' : ''}`} onClick={() => setIsInvoiceOpen((prev) => !prev)} aria-expanded={isInvoiceOpen}>
                <Icon name="invoices" />
                <span className="menu-label">Invoice</span>
                <span className="top-nav__caret">▾</span>
              </button>
              {isInvoiceOpen ? (
                <div className="top-nav__dropdown-menu">
                  {invoiceItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `top-nav__dropdown-item ${isActive ? 'top-nav__dropdown-item--active' : ''}`}>{item.label === 'Invoice' ? 'Manage Invoice' : item.label}</NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {manageItems.length > 0 ? (
            <div ref={manageRef} className="top-nav__dropdown" onMouseEnter={() => setIsManageOpen(true)} onMouseLeave={() => setIsManageOpen(false)}>
              <button type="button" className={`menu-item top-nav__dropdown-trigger ${isManageActive ? 'sidebar__link--active' : ''}`} onClick={() => setIsManageOpen((prev) => !prev)} aria-expanded={isManageOpen}>
                <Icon name="clients" />
                <span className="menu-label">Manage</span>
                <span className="top-nav__caret">▾</span>
              </button>
              {isManageOpen ? (
                <div className="top-nav__dropdown-menu">
                  {manageItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `top-nav__dropdown-item ${isActive ? 'top-nav__dropdown-item--active' : ''}`}>{item.label}</NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {reportsItems.length > 0 ? (
            <div ref={reportsRef} className="top-nav__dropdown" onMouseEnter={() => setIsReportsOpen(true)} onMouseLeave={() => setIsReportsOpen(false)}>
              <button type="button" className={`menu-item top-nav__dropdown-trigger ${isReportsActive ? 'sidebar__link--active' : ''}`} onClick={() => setIsReportsOpen((prev) => !prev)} aria-expanded={isReportsOpen}>
                <Icon name="reports" />
                <span className="menu-label">Reports</span>
                <span className="top-nav__caret">▾</span>
              </button>
              {isReportsOpen ? (
                <div className="top-nav__dropdown-menu">
                  {reportsItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `top-nav__dropdown-item ${isActive ? 'top-nav__dropdown-item--active' : ''}`}>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </nav>

      <aside className={`mobile-nav-drawer ${isOpen ? 'mobile-nav-drawer--open' : 'mobile-nav-drawer--closed'}`} aria-label="Mobile role navigation">
        <div className="sidebar__group-links">
          {primaryItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
              <Icon name={item.icon} />
              <span className="menu-label">{item.label}</span>
            </NavLink>
          ))}
          {reportsItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `menu-item ${isActive ? 'sidebar__link--active' : ''}`}>
              <Icon name="reports" />
              <span className="menu-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
      {isOpen ? <button type="button" className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" /> : null}
    </>
  )
}

export default Sidebar
