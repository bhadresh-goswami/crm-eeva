import type { ReactElement } from 'react'
import type { UserRole } from '../../../context/AuthContext'
import AdminDashboard from '../pages/AdminDashboard'
import CoordinatorDashboard from '../pages/CoordinatorDashboard'
import ExpertDashboard from '../pages/ExpertDashboard'
import ExpertLeadDashboard from '../pages/ExpertLeadDashboard'
import ManagerDashboard from '../pages/ManagerDashboard'
import PortalDashboardPage from '../../portal/pages/PortalDashboardPage'

const dashboardByRole: Record<UserRole, ReactElement> = {
  admin: <AdminDashboard />,
  manager: <ManagerDashboard />,
  coordinator: <CoordinatorDashboard />,
  expert: <ExpertDashboard />,
  expertlead: <ExpertLeadDashboard />,
  client: <PortalDashboardPage />,
  vendor: <PortalDashboardPage />,
}

export const getDashboardByRole = (role: UserRole) => {
  return dashboardByRole[role]
}
