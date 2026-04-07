import { Navigate, Route, Routes } from 'react-router-dom'
import ClientsPage from '../modules/clients/pages/ClientsPage'
import DashboardPage from '../modules/dashboard/pages/DashboardPage'
import TasksPage from '../modules/tasks/pages/TasksPage'
import UsersPage from '../modules/users/pages/UsersPage'
import MainLayout from '../shared/layouts/MainLayout'

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate replace to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
