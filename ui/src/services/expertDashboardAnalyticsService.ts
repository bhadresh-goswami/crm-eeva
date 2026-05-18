import { apiRequest } from '../api/client'

export type DashboardCardMetric = {
  count?: number
  change_percentage?: number
}

export type DailyRow = {
  work_date: string
  worked_hours: number
  total_tasks: number
  interview_support: number
  mock_interview: number
  resume_support: number
  linkedin_support: number
  other_tasks: number
  completed_tasks: number
  success_tasks: number
  rejected_tasks: number
  productivity: number
  status: string
}

export type DailySummary = {
  average_hours?: number
  total_hours?: number
  total_tasks?: number
  productivity?: number
}

export type AnalyticsPayload = {
  cards?: Record<string, DashboardCardMetric>
  daily_working_analytics?: {
    summary?: DailySummary
    rows?: DailyRow[]
  }
}

export type ApiResponse<T> = {
  data: T
}

export const getExpertDashboardAnalytics = async () => {
  const response = await apiRequest<ApiResponse<AnalyticsPayload>>('/expert/dashboard-analytics')
  console.log('Dashboard analytics response', response?.data)
  return response
}
