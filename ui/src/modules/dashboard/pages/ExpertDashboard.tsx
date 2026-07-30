import { useCallback, useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../../tasks/api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'
import PageContainer from '../../../shared/components/PageContainer'
import ExpertWorkspaceHeader from '../../../shared/components/ExpertWorkspaceHeader'
import {
  getExpertDashboardAnalytics,
  recalculateExpertTaskDuration,
  type AnalyticsPayload,
} from '../../../services/expertDashboardAnalyticsService'
import StatCard from '../../../components/dashboard/StatCard'
import DailyWorkingAnalyticsTable from '../../../components/dashboard/DailyWorkingAnalyticsTable'
import { useAlert } from '../../../shared/alerts/useAlert'

const emptyAnalytics: AnalyticsPayload = {
  daily_working_analytics: {
    summary: {},
    rows: [],
  },
}

const ExpertDashboard = () => {
  const { user } = useAuth()
  const { showToast } = useAlert()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [recalculatingDuration, setRecalculatingDuration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload>(emptyAnalytics)
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
      setAnalytics(response?.data ?? emptyAnalytics)
    } catch {
      setAnalytics(emptyAnalytics)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])


  const handleRecalculateDuration = useCallback(async () => {
    setRecalculatingDuration(true)
    try {
      const result = await recalculateExpertTaskDuration()
      showToast({
        type: 'success',
        title: 'Duration recalculation completed.',
        message: `Updated: ${result.updated} tasks
Skipped: ${result.skipped} tasks`,
      })
      await Promise.all([loadAnalytics(), loadTasks(dateRangeFilter)])
    } catch (recalculateError) {
      showToast({
        type: 'error',
        message: recalculateError instanceof Error ? recalculateError.message : 'Failed to recalculate task durations.',
      })
    } finally {
      setRecalculatingDuration(false)
    }
  }, [dateRangeFilter, loadAnalytics, loadTasks, showToast])

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
    <PageContainer>
      <ExpertWorkspaceHeader title="Technical Expert Dashboard" />
      <style>{`.stat-card-hover{transition:all .2s ease}.stat-card-hover:hover{transform:translateY(-3px)}`}</style>
      <div className="row g-3 section">
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Assigned Tasks" count={analytics.cards?.assigned?.count ?? 0} changePercentage={analytics.cards?.assigned?.change_percentage ?? 0} color="blue" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Completed Tasks" count={analytics.cards?.completed?.count ?? 0} changePercentage={analytics.cards?.completed?.change_percentage ?? 0} color="green" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Success Tasks" count={analytics.cards?.success?.count ?? 0} changePercentage={analytics.cards?.success?.change_percentage ?? 0} color="cyan" loading={analyticsLoading} /></div>
        <div className="col-12 col-md-6 col-xl-3"><StatCard title="Rejected Tasks" count={analytics.cards?.rejected?.count ?? 0} changePercentage={analytics.cards?.rejected?.change_percentage ?? 0} color="red" loading={analyticsLoading} /></div>
      </div>

      <div className="row g-3 section">
        <div className="col-12">
          <DailyWorkingAnalyticsTable
            data={analytics.daily_working_analytics ?? emptyAnalytics.daily_working_analytics}
            loading={analyticsLoading}
            onRecalculateDuration={handleRecalculateDuration}
            recalculatingDuration={recalculatingDuration}
          />
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
