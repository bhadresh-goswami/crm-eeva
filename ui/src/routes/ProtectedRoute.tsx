import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'

type ProtectedRouteProps = {
  allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate replace to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to="/dashboard" />
  }

  return <Outlet />
}

export default ProtectedRoute
