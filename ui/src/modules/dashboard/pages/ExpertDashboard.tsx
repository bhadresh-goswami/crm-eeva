import { useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../../tasks/api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'

const ExpertDashboard = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignedTasksCount] = useState(42)
  const [completedTasksCount] = useState(29)
  const [pendingFeedbackCount] = useState(6)
  const [successRatioMonthly] = useState(85)
  const [successRatioTrend] = useState(5)
  const [threeMonthAverage] = useState(78)
  const [threeMonthTrend] = useState(3)
  const [successChart] = useState([
    { month: 'Jan', value: 70 },
    { month: 'Feb', value: 80 },
    { month: 'Mar', value: 85 },
  ])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getExpertTasks({ activeOnly: true })
        if (mounted) setTasks(result)
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to fetch tasks.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const chartMax = 100
  const chartWidth = 760
  const chartHeight = 220
  const chartPadding = { top: 16, right: 20, bottom: 34, left: 36 }
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const barWidth = plotWidth / successChart.length
  const linePoints = successChart
    .map((item, index) => {
      const x = chartPadding.left + barWidth * index + barWidth / 2
      const y = chartPadding.top + (1 - item.value / chartMax) * plotHeight
      return `${x},${y}`
    })
    .join(' ')

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <h1 className="page-title">Technical Expert Dashboard</h1>
      <p className="page-description">Active assigned tasks only.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-3px)' }} onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)' }} style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)', transition: 'transform 160ms ease' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8' }}>📋 Tasks Assigned to Me</p>
          <h3 style={{ margin: '0.5rem 0 0', fontSize: 26, color: '#1e3a8a' }}>{assignedTasksCount}</h3>
        </div>
        <div onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-3px)' }} onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)' }} style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)', transition: 'transform 160ms ease' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>✅ Completed Tasks</p>
          <h3 style={{ margin: '0.5rem 0 0', fontSize: 26, color: '#166534' }}>{completedTasksCount}</h3>
        </div>
        <div onMouseEnter={(event) => { event.currentTarget.style.transform = 'translateY(-3px)' }} onMouseLeave={(event) => { event.currentTarget.style.transform = 'translateY(0)' }} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)', transition: 'transform 160ms ease' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#c2410c' }}>⏳ Pending for Feedback</p>
          <h3 style={{ margin: '0.5rem 0 0', fontSize: 26, color: '#9a3412' }}>{pendingFeedbackCount}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)' }}>
          <p style={{ margin: 0, color: '#374151', fontSize: 13 }}>This Month Success Ratio</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <h3 style={{ margin: 0, fontSize: 28, color: '#111827' }}>{successRatioMonthly}%</h3>
            <span style={{ color: successRatioTrend >= 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
              {successRatioTrend >= 0 ? '⬆' : '⬇'} {successRatioTrend >= 0 ? '+' : ''}{successRatioTrend}% vs last month
            </span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)' }}>
          <p style={{ margin: 0, color: '#374151', fontSize: 13 }}>Last 3 Months Avg Success</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <h3 style={{ margin: 0, fontSize: 28, color: '#111827' }}>{threeMonthAverage}%</h3>
            <span style={{ color: threeMonthTrend >= 0 ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
              {threeMonthTrend >= 0 ? '⬆' : '⬇'} {threeMonthTrend >= 0 ? '+' : ''}{threeMonthTrend}% trend
            </span>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: 16 }}>Success Trend (Last 3 Months)</h3>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Monthly success trend chart" style={{ width: '100%', minWidth: 540, height: 240 }}>
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = chartPadding.top + (1 - tick / chartMax) * plotHeight
              return (
                <g key={tick}>
                  <line x1={chartPadding.left} y1={y} x2={chartWidth - chartPadding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  <text x={chartPadding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{tick}%</text>
                </g>
              )
            })}
            {successChart.map((item, index) => {
              const x = chartPadding.left + barWidth * index + barWidth * 0.2
              const barH = (item.value / chartMax) * plotHeight
              const y = chartPadding.top + plotHeight - barH
              return (
                <g key={item.month}>
                  <title>{`${item.month}: ${item.value}%`}</title>
                  <rect x={x} y={y} width={barWidth * 0.6} height={barH} fill="#93c5fd" rx="6" />
                  <text x={x + barWidth * 0.3} y={chartHeight - 12} textAnchor="middle" fontSize="12" fill="#6b7280">{item.month}</text>
                </g>
              )
            })}
            <polyline points={linePoints} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {successChart.map((item, index) => {
              const x = chartPadding.left + barWidth * index + barWidth / 2
              const y = chartPadding.top + (1 - item.value / chartMax) * plotHeight
              return <circle key={`${item.month}-dot`} cx={x} cy={y} r="4" fill="#1d4ed8"><title>{`${item.month}: ${item.value}%`}</title></circle>
            })}
          </svg>
        </div>
      </div>

      <ExpertTaskTable
        tasks={tasks}
        loading={loading}
        error={error}
        emptyText="No active tasks assigned"
        currentUserId={Number(user?.id ?? 0)}
      />
    </section>
  )
}

export default ExpertDashboard
