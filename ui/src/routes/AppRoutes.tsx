import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../modules/auth/pages/LoginPage'
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage'
import NotFoundPage from '../modules/auth/pages/NotFoundPage'
import CandidatesPage from '../modules/candidates/pages/CandidatesPage'
import ClientsPage from '../modules/clients/pages/ClientsPage'
import DashboardPage from '../modules/dashboard/pages/DashboardPage'
import RolesPage from '../modules/roles/pages/RolesPage'
import PocsPage from '../modules/pocs/pages/PocsPage'
import TasksEntryPage from '../modules/tasks/pages/TasksEntryPage'
import BulkPriceUpdatePage from '../modules/tasks/pages/BulkPriceUpdatePage'
import ReportsTasksPage from '../modules/tasks/pages/ReportsTasksPage'
import CandidateReportPage from '../modules/tasks/pages/CandidateReportPage'
import ExpertTaskReportsPage from '../modules/tasks/pages/ExpertTaskReportsPage'
import FeedbackReportPage from '../modules/tasks/pages/FeedbackReportPage'

import UsersPage from '../modules/users/pages/UsersPage'
import InvoiceListPage from '../modules/invoices/pages/InvoiceListPage'
import InvoiceCreatePage from '../modules/invoices/pages/InvoiceCreatePage'
import InvoiceDetailPage from '../modules/invoices/pages/InvoiceDetailPage'
import { useAuth } from '../context/AuthContext'
import AdminDashboard from '../modules/dashboard/pages/AdminDashboard'
import CoordinatorDashboard from '../modules/dashboard/pages/CoordinatorDashboard'
import ExpertDashboard from '../modules/dashboard/pages/ExpertDashboard'
import ExpertLeadDashboard from '../modules/dashboard/pages/ExpertLeadDashboard'
import ManagerDashboard from '../modules/dashboard/pages/ManagerDashboard'
import MainLayout from '../shared/layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'
import { getRoleDashboardPath } from './roleDashboard'

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth()

  return <Navigate replace to={isAuthenticated ? getRoleDashboardPath(user?.role) : '/login'} />
}

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['coordinator']} />}>
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['expertlead']} />}>
            <Route path="/teamlead/dashboard" element={<ExpertLeadDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['expert']} />}>
            <Route path="/expert/dashboard" element={<ExpertDashboard />} />
          </Route>

          <Route path="/tasks" element={<TasksEntryPage />} />
          <Route element={<ProtectedRoute allowedRoles={['expert', 'expertlead']} />}>
            <Route path="/tasks/expert-reports" element={<ExpertTaskReportsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/tasks/bulk-price" element={<BulkPriceUpdatePage />} />
            <Route path="/tasks/payment-correction" element={<BulkPriceUpdatePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'coordinator', 'expert', 'expertlead']} />}>
            <Route path="/reports/tasks" element={<ReportsTasksPage />} />
            <Route path="/reports/candidates" element={<CandidateReportPage />} />
            <Route path="/reports/feedback" element={<FeedbackReportPage />} />
          </Route>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/pocs" element={<PocsPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/invoices/create" element={<InvoiceCreatePage />} />
            <Route path="/invoices/detail" element={<InvoiceDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/roles" element={<RolesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  )
}

export default AppRoutes
