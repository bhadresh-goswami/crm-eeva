import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../../../components/dashboard/StatusBadge'
import KPIStatCard from '../../../components/dashboard/KPIStatCard'
import PageContainer from '../../../shared/components/PageContainer'
import { getPortalSummary, type PortalSummary } from '../api/portalApi'

const emptySummary: PortalSummary = {
  summary: { total_tasks: 0, completed_tasks: 0, open_tasks: 0, total_amount: 0 },
  recent_tasks: [],
}

const formatDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

const PortalDashboardPage = () => {
  const [summary, setSummary] = useState<PortalSummary>(emptySummary)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  useEffect(() => {
    getPortalSummary()
      .then((data) => {
        setSummary(data)
        setPageError(null)
      })
      .catch((error) => setPageError(error instanceof Error ? error.message : 'Failed to load portal dashboard.'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <PageContainer title="Portal Dashboard" description="A secure client/vendor view of your support work.">
      {pageError ? <div className="alert alert-danger">{pageError}</div> : null}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3"><KPIStatCard title="Total Tasks" value={summary.summary.total_tasks} helperText="All visible portal tasks" icon="📋" accent="primary" /></div>
        <div className="col-12 col-md-3"><KPIStatCard title="Open Tasks" value={summary.summary.open_tasks} helperText="Tasks not yet completed" icon="⏳" accent="warning" /></div>
        <div className="col-12 col-md-3"><KPIStatCard title="Completed" value={summary.summary.completed_tasks} helperText="Completed support work" icon="✓" accent="success" /></div>
        <div className="col-12 col-md-3"><KPIStatCard title="Total Amount" value={`$${summary.summary.total_amount.toFixed(2)}`} helperText="Amount across visible tasks" icon="$" accent="info" /></div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Recent Tasks</h5>
          <Link to="/portal/tasks" className="btn btn-sm btn-outline-primary">View All</Link>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr><th>Task</th><th>Candidate</th><th>Type</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="text-center py-4 text-muted">Loading dashboard...</td></tr> : null}
              {!isLoading && summary.recent_tasks.length === 0 ? <tr><td colSpan={5} className="text-center py-4 text-muted">No tasks available.</td></tr> : null}
              {!isLoading && summary.recent_tasks.map((task) => (
                <tr key={task.id}>
                  <td><div className="fw-semibold">{task.title || `Task #${task.id}`}</div><div className="text-muted small">{task.client_name || '-'}</div></td>
                  <td>{task.candidate_name || '-'}</td>
                  <td>{task.task_type || '-'}</td>
                  <td>{task.status_name ? <StatusBadge status={task.status_name} /> : '-'}</td>
                  <td>{formatDate(task.due_date || task.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  )
}

export default PortalDashboardPage
