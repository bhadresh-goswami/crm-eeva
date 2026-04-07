import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import DashboardSection from './DashboardSection'

type RoleDashboardProps = {
  roleLabel: string
}

const RoleDashboard = ({ roleLabel }: RoleDashboardProps) => {
  const { breakIn, breakOut, logout, sessionStatus } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  const onLogout = async () => {
    await logout()
    setShouldRedirect(true)
  }

  if (shouldRedirect) {
    return <Navigate replace to="/login" />
  }

  return (
    <section>
      <h2 className="page-title">{roleLabel} Dashboard</h2>
      <p className="page-description">Overview tailored for the {roleLabel.toLowerCase()} role.</p>
      <p className="page-description">Session status: {sessionStatus.replace('_', ' ')}</p>
      <div className="dashboard-actions">
        <button type="button" className="button" onClick={breakIn}>
          Break In
        </button>
        <button type="button" className="button" onClick={breakOut}>
          Break Out
        </button>
        <button type="button" className="button button--danger" onClick={onLogout}>
          Logout
        </button>
      </div>
      <div className="cards-grid">
        <DashboardSection title="Summary" />
        <DashboardSection title="Tasks" />
        <DashboardSection title="Activity" />
      </div>
    </section>
  )
}

export default RoleDashboard
