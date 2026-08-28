import { useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { getRoleDashboardPath } from '../../../routes/roleDashboard'

const NotFoundPage = () => {
  const { isAuthenticated, user } = useAuth()

  const dashboardPath = useMemo(() => {
    if (!isAuthenticated) return '/login'
    return getRoleDashboardPath(user?.role)
  }, [isAuthenticated, user?.role])

  return (
    <section className="not-found-page">
      <div className="not-found-page__content">
        <div className="not-found-dino" aria-hidden="true">
          <span className="not-found-dino__track" />
          <span className="not-found-dino__emoji">🦖</span>
        </div>
        <h1>Page Not Found</h1>
        <p>Oops! The page you are looking for does not exist.</p>
        <div className="not-found-page__actions">
          <button type="button" className="button button--primary" onClick={() => { window.location.href = dashboardPath }}>
            Go to Dashboard
          </button>
          <button type="button" className="button" onClick={() => { window.history.back() }}>
            Go Back
          </button>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
