import { useEffect, useState } from 'react'
import ExpertTaskTable from '../components/ExpertTaskTable'
import { getExpertTasks, sendDailyReportNow, type ExpertTaskItem } from '../api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'
import { useAlert } from '../../../shared/alerts/useAlert'
import ExpertWorkspaceHeader from '../../../shared/components/ExpertWorkspaceHeader'

const ExpertTasksPage = () => {
  const { user } = useAuth()
  const { showToast, showAlert } = useAlert()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState(false)
  const [dateRangeFilter, setDateRangeFilter] = useState<'7' | '10' | 'all'>('7')

  const loadTasks = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getExpertTasks()
      setTasks(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to fetch tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!mounted) return
      await loadTasks()
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <ExpertWorkspaceHeader />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Last 7 Days Tasks</h1>
        <button
          className="button button--primary"
          type="button"
          disabled={sendingReport}
          onClick={async () => {
            try {
              setSendingReport(true)
              const response = await sendDailyReportNow()
              if (response?.email_status === 'sent') {
                showToast({ type: 'success', message: 'Daily report sent.' })
              } else if (response?.email_status === 'failed') {
                showToast({ type: 'warning', message: 'Report requested but email failed.' })
              } else {
                showToast({ type: 'info', message: response?.message ?? 'No report to send.' })
              }
            } catch (sendError) {
              showAlert({
                type: 'error',
                title: 'Report send failed',
                message: sendError instanceof Error ? sendError.message : 'Unable to send report now.',
              })
            } finally {
              setSendingReport(false)
            }
          }}
        >
          {sendingReport ? 'Sending...' : 'Send Report Now'}
        </button>
      </div>
      <p className="page-description">Shows assigned and completed tasks for the selected week, including tasks assigned directly to you and to your team.</p>
      <ExpertTaskTable
        tasks={tasks}
        loading={loading}
        error={error}
        emptyText="No active tasks available"
        currentUserId={Number(user?.id ?? 0)}
        onTaskUpdated={loadTasks}
        dateRangeFilter={dateRangeFilter}
        onDateRangeFilterChange={setDateRangeFilter}
      />
    </section>
  )
}

export default ExpertTasksPage
