import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { getRoleDashboardPath } from '../../../routes/roleDashboard'

const DashboardPage = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate replace to="/login" />
  }

  return <Navigate replace to={getRoleDashboardPath(user.role)} />
}

export default DashboardPage
