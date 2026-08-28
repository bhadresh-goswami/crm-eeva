import type { UserRole } from '../context/AuthContext'

export const roleDashboardPath: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  manager: '/manager/dashboard',
  coordinator: '/coordinator/dashboard',
  expertlead: '/teamlead/dashboard',
  expert: '/expert/dashboard',
}

export const getRoleDashboardPath = (role?: UserRole | null) => {
  if (!role) {
    return '/login'
  }

  return roleDashboardPath[role]
}
