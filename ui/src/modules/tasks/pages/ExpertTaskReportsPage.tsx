import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'
import FeedbackModal from '../components/FeedbackModal'

const PAGE_SIZE = 10

const formatDate = (value: string) => (value ? value : '--')

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value.includes(' ') ? value.replace(' ', 'T') : value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'completed') return 'bg-success'
  if (normalized === 'in_progress') return 'bg-warning text-dark'
  if (normalized === 'assigned') return 'bg-primary'
  return 'bg-secondary'
}

const ExpertTaskReportsPage = () => {
  const [rows, setRows] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [modalMode, setModalMode] = useState<'ADD' | 'VIEW'>('ADD')
  const [modalTaskId, setModalTaskId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpertTasks()
      setRows(data)
      setPage(1)
    } catch (e) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Failed to load expert task reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  return (
    <PageContainer title="Expert Task Reports" description="Completed tasks with feedback action for experts.">
      <div className="card shadow-sm">
        <div className="card-body">
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}

          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Action</th>
                  <th>Date</th>
                  <th>Candidate</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actual Time (from-to)</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">Loading...</td></tr>
                ) : paginatedRows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4 text-muted">No tasks found.</td></tr>
                ) : (
                  paginatedRows.map((task) => (
                    <tr key={task.task_id}>
                      <td>
                        {task.feedback_action === 'ADD' ? (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setModalMode('ADD'); setModalTaskId(task.task_id) }}>Add Feedback</button>
                        ) : (
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setModalMode('VIEW'); setModalTaskId(task.task_id) }}>View</button>
                        )}
                      </td>
                      <td>{formatDate(task.due_date)}</td>
                      <td>{task.candidate_name || '--'}</td>
                      <td>{task.task_type || '--'}</td>
                      <td><span className={`badge ${statusBadge(task.status_name)}`}>{task.status_name || '--'}</span></td>
                      <td>{formatDateTime(task.task_start_time)} - {formatDateTime(task.task_end_time)}</td>
                      <td>{task.duration > 0 ? `${task.duration} min` : '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">Page {page} of {totalPages}</small>
            <div className="btn-group">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal
        open={modalTaskId !== null}
        mode={modalMode}
        taskId={modalTaskId}
        onClose={() => setModalTaskId(null)}
        onSubmitted={() => void load()}
      />
    </PageContainer>
  )
}

export default ExpertTaskReportsPage
