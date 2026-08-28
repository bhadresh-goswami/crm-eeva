import { useCallback, useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import {
  getExpertTasks,
  type ExpertTaskItem,
} from '../../tasks/api/expertTasksApi'
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
import { useNavigate } from 'react-router-dom'
import './ExpertDashboard.css'

const emptyAnalytics: AnalyticsPayload = {
  daily_working_analytics: {
    summary: {},
    rows: [],
  },
}

const ExpertDashboard = () => {
  const { user } = useAuth()
  const { showToast } = useAlert()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [recalculatingDuration, setRecalculatingDuration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] =
    useState<AnalyticsPayload>(emptyAnalytics)

  const [dateRangeFilter, setDateRangeFilter] =
    useState<'7' | '10' | 'all'>('7')

  const loadTasks = useCallback(
    async (
      range: '7' | '10' | 'all' = dateRangeFilter,
      silent = false,
    ) => {
      if (!silent) {
        setLoading(true)
      }

      setError(null)

      try {
        const today = new Date()
        const toDate = today.toISOString().slice(0, 10)

        const params: {
          fromDate?: string
          toDate?: string
        } = {}

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
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to fetch tasks.',
        )
      } finally {
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [dateRangeFilter],
  )

  const loadAnalytics = useCallback(async (silent = false) => {
    if (!silent) {
      setAnalyticsLoading(true)
    }

    try {
      const response = await getExpertDashboardAnalytics()

      setAnalytics(response?.data ?? emptyAnalytics)
    } catch {
      setAnalytics(emptyAnalytics)
    } finally {
      if (!silent) {
        setAnalyticsLoading(false)
      }
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

      await Promise.all([
        loadAnalytics(),
        loadTasks(dateRangeFilter),
      ])
    } catch (recalculateError) {
      showToast({
        type: 'error',
        message:
          recalculateError instanceof Error
            ? recalculateError.message
            : 'Failed to recalculate task durations.',
      })
    } finally {
      setRecalculatingDuration(false)
    }
  }, [
    dateRangeFilter,
    loadAnalytics,
    loadTasks,
    showToast,
  ])

  /*
   * Initial dashboard load.
   */
  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!mounted) return

      await Promise.all([
        loadTasks(dateRangeFilter),
        loadAnalytics(),
      ])
    }

    void load()

    return () => {
      mounted = false
    }
  }, [dateRangeFilter, loadAnalytics, loadTasks])

  /*
   * Background dashboard refresh.
   *
   * IMPORTANT:
   * Keep ONE copy of this effect only.
   */
  useEffect(() => {
    const refresh = window.setInterval(() => {
      void Promise.all([
        loadTasks(dateRangeFilter, true),
        loadAnalytics(true),
      ])
    }, 30000)

    return () => {
      window.clearInterval(refresh)
    }
  }, [dateRangeFilter, loadAnalytics, loadTasks])

  const pendingFeedback =
    analytics.cards?.pending_feedback?.count ?? 0


  return (
    <PageContainer className="expert-dashboard">
      <ExpertWorkspaceHeader
        title="Technical Expert Dashboard"
        compact
      />

      <div className="expert-dashboard__kpis section">
        <StatCard
          compact
          icon="▣"
          title="Assigned Tasks"
          count={analytics.cards?.assigned?.count ?? 0}
          supportingText="Scheduled tasks"
          changePercentage={
            analytics.cards?.assigned?.change_percentage ?? 0
          }
          color="blue"
          loading={analyticsLoading}
        />

        <StatCard
          compact
          icon="✓"
          title="Completed Tasks"
          count={analytics.cards?.completed?.count ?? 0}
          supportingText="Completed tasks"
          changePercentage={
            analytics.cards?.completed?.change_percentage ?? 0
          }
          color="green"
          loading={analyticsLoading}
        />

        <button
          type="button"
          className={`expert-dashboard__pending${
            pendingFeedback > 0 ? ' is-actionable' : ''
          }`}
          onClick={() =>
            navigate('/tasks/expert-reports')
          }
        >
          <span className="expert-dashboard__pending-icon">
            ◷
          </span>

          <div>
            <span>Pending Feedback</span>

            <strong>
              {pendingFeedback}
              {pendingFeedback > 0 ? <i /> : null}
            </strong>

            <b>
              {pendingFeedback > 0
                ? 'Needs your attention'
                : 'All feedback completed'}
            </b>

            <small>
              {pendingFeedback} pending feedback
            </small>
          </div>
        </button>

        <StatCard
          compact
          icon="●"
          title="Success Tasks"
          count={analytics.cards?.success?.count ?? 0}
          supportingText="Completed successfully"
          changePercentage={
            analytics.cards?.success?.change_percentage ?? 0
          }
          color="cyan"
          loading={analyticsLoading}
        />

        <StatCard
          compact
          icon="×"
          title="Rejected Tasks"
          count={analytics.cards?.rejected?.count ?? 0}
          supportingText="Tasks rejected"
          changePercentage={
            analytics.cards?.rejected?.change_percentage ?? 0
          }
          color="red"
          loading={analyticsLoading}
        />
      </div>

      <div className="row g-3 section">
        <div className="col-12">
          <DailyWorkingAnalyticsTable
            data={
              analytics.daily_working_analytics ??
              emptyAnalytics.daily_working_analytics
            }
            loading={analyticsLoading}
            onRecalculateDuration={
              handleRecalculateDuration
            }
            recalculatingDuration={
              recalculatingDuration
            }
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
        onDateRangeFilterChange={
          setDateRangeFilter
        }
        dashboardMode
      />
    </PageContainer>
  )
}

export default ExpertDashboard
