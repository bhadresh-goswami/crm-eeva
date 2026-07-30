import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'
import { getRoleDashboardPath } from './roleDashboard'

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate replace to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to={getRoleDashboardPath(user.role)} />
  }

  return <Outlet />
}

export default ProtectedRoute
