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
      <section className="card section p-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-semibold">Status</label>
            <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="cancelled">cancelled</option>
              <option value="assigned">assigned</option>
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-semibold">From Date</label>
            <input className="form-control" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fw-semibold">To Date</label>
            <input className="form-control" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <div className="col-12 col-md-6 col-lg-3 d-grid">
            <button className="btn btn-primary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
        </div>
      </section>

      <section className="card section p-3">
        <div className="d-flex flex-wrap gap-2">
          <span className="badge text-bg-success fs-6 px-3 py-2">Completed: {grouped.completed}</span>
          <span className="badge text-bg-secondary fs-6 px-3 py-2">Pending: {grouped.pending}</span>
          <span className="badge text-bg-primary fs-6 px-3 py-2">Assigned: {grouped.assigned}</span>
          <span className="badge text-bg-danger fs-6 px-3 py-2">Cancelled: {grouped.cancelled}</span>
        </div>
      </section>

      <section className="card section p-3">
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Date</th>
                <th>Candidate</th>
                <th>Company</th>
                <th>Assign To</th>
              </tr>
            </thead>
          <tbody>
            {loading ? <tr><td colSpan={6}>Loading...</td></tr> : tasks.length === 0 ? <tr><td colSpan={6}>No tasks found.</td></tr> : tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td className="text-capitalize">{task.status}</td>
                <td>{task.due_date || '-'}</td>
                <td>{task.candidate || '-'}</td>
                <td>{task.client || '-'}</td>
                <td>{task.assigned_to_name || '-'}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </section>

      {error ? <div className="alert alert-danger mb-0" role="alert">{error}</div> : null}
    </PageContainer>
  )
}

export default ReportsTasksPage
