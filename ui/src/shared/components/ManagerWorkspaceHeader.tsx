import { type ReactNode } from 'react'
import { FaBell, FaUserCircle } from 'react-icons/fa'

type ManagerWorkspaceHeaderProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  notificationCount?: number
  onNotificationsClick?: () => void
  eyebrow?: string
  breakStatusLabel?: string
  roleLabel?: string
}

const formatToday = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const ManagerWorkspaceHeader = ({
  title,
  subtitle,
  actions,
  notificationCount = 0,
  onNotificationsClick,
  eyebrow = 'Manager Workspace',
  breakStatusLabel = 'Active',
  roleLabel = 'Manager',
}: ManagerWorkspaceHeaderProps) => (
  <section className="manager-hero section">
    <div>
      <p className="manager-hero__eyebrow">{eyebrow}</p>
      <h3 className="manager-hero__title">{title}</h3>
      {subtitle ? <p className="manager-hero__subtitle">{subtitle}</p> : null}
      <p className="manager-hero__meta">{formatToday()}</p>
    </div>
    <div className="manager-hero__actions">
      {actions}
      <button className="header__icon-btn" type="button" aria-label="Notifications" onClick={onNotificationsClick}>
        <FaBell />
        {notificationCount > 0 ? <span className="crm-status-badge crm-status-badge--pending notification-badge--blink">{notificationCount}</span> : null}
      </button>
      <span className="crm-status-badge crm-status-badge--pending">Break Status: {breakStatusLabel}</span>
      <span className="manager-avatar"><FaUserCircle /> {roleLabel}</span>
    </div>
  </section>
)

export default ManagerWorkspaceHeader
