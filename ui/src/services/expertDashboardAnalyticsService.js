import { apiRequest } from '../api/client'

export const getExpertDashboardAnalytics = async () => {
  return apiRequest('/expert/dashboard-analytics')
}
