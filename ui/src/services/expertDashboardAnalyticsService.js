import { apiRequest } from '../api/client'

export const getExpertDashboardAnalytics = async () => {
  const response = await apiRequest('/expert/dashboard-analytics')
  console.log('Dashboard analytics response', response?.data)
  return response
}
