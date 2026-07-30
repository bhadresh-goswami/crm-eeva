declare module '../../../services/expertDashboardAnalyticsService' {
  import type { AxiosResponse } from 'axios'

  export function getExpertDashboardAnalytics(): Promise<AxiosResponse<unknown>>
  export function recalculateExpertTaskDuration(): Promise<{ success: boolean; message?: string; updated: number; skipped: number }>
}

declare module '../../../components/dashboard/StatCard' {
  import type { JSX } from 'react'

  type StatCardProps = {
    title: string
    count?: number
    changePercentage?: number | null
    color?: 'blue' | 'green' | 'cyan' | 'red' | 'primary'
    loading?: boolean
  }

  const StatCard: (props: StatCardProps) => JSX.Element
  export default StatCard
}

declare module '../../../components/dashboard/DailyWorkingAnalyticsTable' {
  import type { JSX } from 'react'

  type DailySummary = {
    average_minutes?: number
    total_minutes?: number
    total_tasks?: number
    productivity?: number
  }

  type DailyRow = {
    work_date: string
    total_minutes: number
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

  type DailyWorkingAnalyticsTableProps = {
    data?: { summary?: DailySummary; rows?: DailyRow[] }
    loading?: boolean
    onRecalculateDuration?: () => void
    recalculatingDuration?: boolean
  }

  const DailyWorkingAnalyticsTable: (props: DailyWorkingAnalyticsTableProps) => JSX.Element
  export default DailyWorkingAnalyticsTable
}

declare module '../modules/tasks/pages/CandidatePerformanceReport' {
  import type { JSX } from 'react'

  const CandidatePerformanceReport: () => JSX.Element
  export default CandidatePerformanceReport
}
