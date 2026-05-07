import { useCallback, useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../../tasks/api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'
import DashboardCard from '../../../shared/components/DashboardCard'
import ChartCard from '../../../shared/components/ChartCard'
import PageContainer from '../../../shared/components/PageContainer'

const ExpertDashboard = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignedTasksCount] = useState(42)
  const [completedTasksCount] = useState(29)
  const [pendingFeedbackCount] = useState(6)
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

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!mounted) return
      await loadTasks(dateRangeFilter)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [dateRangeFilter, loadTasks])

  return (
    <PageContainer title="Technical Expert Dashboard" description="Active assigned tasks only.">
      <div className="metric-grid section">
        <DashboardCard title="Tasks Assigned" value={assignedTasksCount} trend={5} />
        <DashboardCard title="Completed Tasks" value={completedTasksCount} trend={3} />
        <DashboardCard title="Pending Feedback" value={pendingFeedbackCount} trend={-2} />
      </div>

      <div className="charts-grid section">
        <ChartCard title="Activity Trend">
          <p className="card-text">Jan 70% • Feb 80% • Mar 85%</p>
        </ChartCard>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <ChartCard title="Donut Ratio">
            <p className="card-text">Completion 85%</p>
          </ChartCard>
          <ChartCard title="Pie Mix">
            <p className="card-text">Pending 15%</p>
          </ChartCard>
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
