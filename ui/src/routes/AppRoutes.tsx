import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../modules/auth/pages/LoginPage'
import ClientsPage from '../modules/clients/pages/ClientsPage'
import DashboardPage from '../modules/dashboard/pages/DashboardPage'
import RolesPage from '../modules/roles/pages/RolesPage'
import TasksPage from '../modules/tasks/pages/TasksPage'
import UsersPage from '../modules/users/pages/UsersPage'
import { useAuth } from '../context/AuthContext'
import MainLayout from '../shared/layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'

const RootRedirect = () => {
  const { isAuthenticated } = useAuth()

  return <Navigate replace to={isAuthenticated ? '/dashboard' : '/login'} />
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/users" element={<UsersPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default AppRoutes
