import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { getDashboardByRole } from '../utils/getDashboardByRole'

const DashboardPage = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate replace to="/login" />
  }

  return getDashboardByRole(user.role)
}

export default DashboardPage
