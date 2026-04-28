import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getTaskAssignmentReport, getTaskReport, type TaskRecord } from '../api/tasksApi'

const ReportsTasksPage = () => {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [taskRows, assignmentRows] = await Promise.all([
        getTaskReport({ status: status || undefined, from_date: fromDate || undefined, to_date: toDate || undefined }),
        getTaskAssignmentReport({ status: status || undefined, from_date: fromDate || undefined, to_date: toDate || undefined }),
      ])

      const assignmentMap = new Map<number, string>()
      assignmentRows.forEach((row) => assignmentMap.set(row.task_id, row.assigned_to_name))

      const merged = taskRows.map((row) => ({
        ...row,
        assigned_to_name: assignmentMap.get(row.id) ?? row.assigned_to_name,
      }))

      setTasks(merged)
    } catch (loadError) {
      setTasks([])
      setError(loadError instanceof Error ? loadError.message : 'Failed to load task reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => ({
    completed: tasks.filter((task) => task.status === 'completed').length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    assigned: tasks.filter((task) => task.status === 'assigned').length,
    cancelled: tasks.filter((task) => task.status === 'cancelled').length,
  }), [tasks])

  return (
    <PageContainer title="Task Reports" description="Role-based reporting across task status, schedule and assignments.">
      <section className="card section" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))' }}>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All</option><option value="completed">completed</option><option value="pending">pending</option><option value="cancelled">cancelled</option><option value="assigned">assigned</option></select></label>
        <label>From Date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label>To Date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}><button className="button" onClick={() => void load()}>{loading ? 'Loading...' : 'Apply'}</button></div>
      </section>

      <section className="card section" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="button">Completed: {grouped.completed}</span>
        <span className="button">Pending: {grouped.pending}</span>
        <span className="button">Assigned: {grouped.assigned}</span>
        <span className="button">Cancelled: {grouped.cancelled}</span>
      </section>

      <section className="roles-table__wrapper card section">
        <table className="roles-table">
          <thead><tr><th>ID</th><th>Status</th><th>Date</th><th>Candidate</th><th>Company</th><th>Assign To</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6}>Loading...</td></tr> : tasks.length === 0 ? <tr><td colSpan={6}>No tasks found.</td></tr> : tasks.map((task) => (
              <tr key={task.id}><td>{task.id}</td><td>{task.status}</td><td>{task.due_date || '-'}</td><td>{task.candidate}</td><td>{task.client}</td><td>{task.assigned_to_name || '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      {error ? <p className="auth-card__error">{error}</p> : null}
    </PageContainer>
  )
}

export default ReportsTasksPage
