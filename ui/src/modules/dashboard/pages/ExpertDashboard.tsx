import { useCallback, useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../../tasks/api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'
import PageContainer from '../../../shared/components/PageContainer'
import { getExpertDashboardAnalytics } from '../../../services/expertDashboardAnalyticsService'
import StatCard from '../../../components/dashboard/StatCard'
import WorkingHoursChart from '../../../components/dashboard/WorkingHoursChart'
import TaskRatioChart from '../../../components/dashboard/TaskRatioChart'
import TodayDistributionChart from '../../../components/dashboard/TodayDistributionChart'

type AnalyticsPayload = {
  cards?: Record<string, { count?: number; change_percentage?: number }>
  working_hours_trend?: Array<{ date: string; worked_hours: number }>
  task_status_ratio?: Array<{ status_name: string; total: number }>
  today_distribution?: Array<{ status_name: string; total_hours: number }>
}

const ExpertDashboard = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload>({})
  const [dateRangeFilter, setDateRangeFilter] = useState<'7' | '10' | 'all'>('7')

  const loadTasks = useCallback(async (range: '7' | '10' | 'all' = dateRangeFilter) => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date()
      const toDate = today.toISOString().slice(0, 10)
      const params: { fromDate?: string; toDate?: string } = {}
      if (range !== 'all') {
        const days = Number(range)
        const start = new Date(today)
        start.setDate(today.getDate() - days)
        params.fromDate = start.toISOString().slice(0, 10)
        params.toDate = toDate
      }
      const result = await getExpertTasks(params)
      setTasks(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch tasks.')
    } finally {
      setLoading(false)
    }
  }, [dateRangeFilter])

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const response = await getExpertDashboardAnalytics()
      setAnalytics((response?.data ?? {}) as AnalyticsPayload)
    } catch {
      setAnalytics({})
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!mounted) return
      await Promise.all([loadTasks(dateRangeFilter), loadAnalytics()])
    }
    void load()
    return () => {
      mounted = false
    }
  }, [dateRangeFilter, loadAnalytics, loadTasks])

  return (
    <PageContainer title="Technical Expert Dashboard" description="Active assigned tasks only.">
      <style>{`.stat-card-hover{transition:all .2s ease}.stat-card-hover:hover{transform:translateY(-3px)}`}</style>
      <div className="row g-3 section">
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Assigned Tasks" count={analytics.cards?.assigned?.count ?? 0} changePercentage={analytics.cards?.assigned?.change_percentage ?? 0} color="blue" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Completed Tasks" count={analytics.cards?.completed?.count ?? 0} changePercentage={analytics.cards?.completed?.change_percentage ?? 0} color="green" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Success Tasks" count={analytics.cards?.success?.count ?? 0} changePercentage={analytics.cards?.success?.change_percentage ?? 0} color="cyan" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Rejected Tasks" count={analytics.cards?.rejected?.count ?? 0} changePercentage={analytics.cards?.rejected?.change_percentage ?? 0} color="red" loading={analyticsLoading} /></div>
      </div>

      <div className="row g-3 section">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 h-100"><div className="card-body p-4"><h5 className="mb-3">Monthly Working Hours Trend</h5><WorkingHoursChart data={analytics.working_hours_trend ?? []} loading={analyticsLoading} /></div></div>
        </div>
        <div className="col-12 col-lg-4 d-grid gap-3">
          <div className="card border-0 shadow-sm rounded-4"><div className="card-body p-4"><h6 className="mb-3">Task Status Ratio</h6><TaskRatioChart data={analytics.task_status_ratio ?? []} loading={analyticsLoading} /></div></div>
          <div className="card border-0 shadow-sm rounded-4"><div className="card-body p-4"><h6 className="mb-3">Today's Work Distribution</h6><TodayDistributionChart data={analytics.today_distribution ?? []} loading={analyticsLoading} /></div></div>
        </div>
      </div>

      <ExpertTaskTable
        tasks={tasks}
        loading={loading}
        error={error}
        emptyText="No active tasks assigned"
        currentUserId={Number(user?.id ?? 0)}
        onTaskUpdated={() => loadTasks(dateRangeFilter)}
        dateRangeFilter={dateRangeFilter}
        onDateRangeFilterChange={setDateRangeFilter}
      />
    </PageContainer>
  )
}

export default ExpertDashboard
