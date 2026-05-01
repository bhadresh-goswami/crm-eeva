import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getTaskAssignmentReport, getTaskReport, getTaskTypes, type TaskRecord, type TaskTypeOption } from '../api/tasksApi'
import { getExpertTasks } from '../api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'

const ReportsTasksPage = () => {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [taskTypeId, setTaskTypeId] = useState('')
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[]>([])
  const { user } = useAuth()
  const role = String(user?.role ?? '').toLowerCase()
  const isExpertRole = ['expert', 'technical expert', 'expertlead', 'technical lead'].includes(role)

  const [currentPage, setCurrentPage] = useState(1)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isExpertRole) {
        const expertRows = await getExpertTasks({
          status: status || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          taskTypeId: taskTypeId ? Number(taskTypeId) : undefined,
        })

        const mappedRows: TaskRecord[] = expertRows.map((row) => ({
          id: row.task_id,
          client_id: null,
          client: row.company_name,
          candidate: row.candidate_name,
          candidate_id: null,
          poc: '',
          poc_id: null,
          task_type_id: null,
          task_type: row.support_type,
          title: row.title,
          description: row.description,
          due_date: row.due_date,
          time_start: row.start_time,
          time_end: row.end_time,
          duration: Number(row.duration ?? 0),
          task_start_time: row.task_start_time,
          task_end_time: row.task_end_time,
          total_amount: 0,
          payment_mode: '',
          payment_status: '',
          status: row.status_name,
          assigned_to_id: row.assigned_to_id,
          assigned_to_name: row.assigned_to_name,
          file_url: row.file_url,
          can_assign: false,
        }))

        setTasks(mappedRows)
      } else {
        const [taskRows, assignmentRows] = await Promise.all([
          getTaskReport({ status: status || undefined, from_date: fromDate || undefined, to_date: toDate || undefined, task_type_id: taskTypeId ? Number(taskTypeId) : undefined }),
          getTaskAssignmentReport({ status: status || undefined, from_date: fromDate || undefined, to_date: toDate || undefined }),
        ])

        const assignmentMap = new Map<number, string>()
        assignmentRows.forEach((row) => assignmentMap.set(row.task_id, row.assigned_to_name))

        const merged = taskRows.map((row) => ({
          ...row,
          assigned_to_name: assignmentMap.get(row.id) ?? row.assigned_to_name,
        }))

        setTasks(merged)
      }
      setCurrentPage(1)
    } catch (loadError) {
      setTasks([])
      setError(loadError instanceof Error ? loadError.message : 'Failed to load task reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void getTaskTypes().then(setTaskTypes).catch(() => setTaskTypes([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleTasks = useMemo(() => {
    if (!isExpertRole || scopeFilter === 'all') return tasks
    const myId = String(user?.id ?? '')
    if (scopeFilter === 'mine') return tasks.filter((task) => String(task.assigned_to_id ?? '') === myId)
    if (scopeFilter === 'team') return tasks.filter((task) => String(task.assigned_to_id ?? '') !== myId)
    return tasks
  }, [isExpertRole, scopeFilter, tasks, user?.id])

  const pageSize = 10
  const totalTasks = visibleTasks.length
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(currentPage * pageSize, totalTasks)
  const paginatedTasks = visibleTasks.slice(startIndex, endIndex)

  const grouped = useMemo(() => ({
    completed: tasks.filter((task) => task.status === 'completed').length,
    pending: tasks.filter((task) => task.status === 'pending').length,
    assigned: tasks.filter((task) => task.status === 'assigned').length,
    cancelled: tasks.filter((task) => task.status === 'cancelled').length,
  }), [tasks])


  const formatTime = (datetime?: string) => {
    if (!datetime) return '--'

    const date = new Date(datetime)
    if (Number.isNaN(date.getTime())) return '--'

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatTimeValue = (value: string) => {
    if (!value) return '-'
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : `1970-01-01T${value}`
    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  return (
    <PageContainer title="Task Reports" description="Role-based reporting across task status, schedule and assignments.">
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-semibold">Status</label>
              <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>


            <div className="col-md-3">
              <label className="form-label fw-semibold">Task Type</label>
              <select className="form-select" value={taskTypeId} onChange={(event) => setTaskTypeId(event.target.value)}>
                <option value="">All Types</option>
                {taskTypes.map((type) => (
                  <option key={type.id} value={String(type.id)}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">From Date</label>
              <input type="date" className="form-control" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">To Date</label>
              <input type="date" className="form-control" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>

            {isExpertRole ? (
              <div className="col-md-3">
                <label className="form-label fw-semibold">Report Scope</label>
                <select className="form-select" value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value); setCurrentPage(1) }}>
                  <option value="all">Own + Team Tasks</option>
                  <option value="mine">My Tasks</option>
                  <option value="team">Team Tasks</option>
                </select>
              </div>
            ) : null}

            <div className="col-md-3 d-grid">
              <button className="btn btn-primary fw-semibold" onClick={() => void load()} disabled={loading}>
                {loading ? 'Loading...' : 'Apply Filter'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="card section p-3">
        <div className="d-flex flex-wrap gap-2">
          <span className="badge text-bg-success fs-6 px-3 py-2">Completed: {grouped.completed}</span>
          <span className="badge text-bg-secondary fs-6 px-3 py-2">Pending: {grouped.pending}</span>
          <span className="badge text-bg-primary fs-6 px-3 py-2">Assigned: {grouped.assigned}</span>
          <span className="badge text-bg-danger fs-6 px-3 py-2">Cancelled: {grouped.cancelled}</span>
        </div>
      </section>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Candidate</th>
                  <th>Assigned To</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Actual Time</th>
                  <th>Duration</th>
                </tr>
              </thead>

              <tbody>
                {loading ? <tr><td colSpan={9} className="text-center text-muted py-4">Loading...</td></tr> : paginatedTasks.length > 0 ? paginatedTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>

                    <td>
                      <span className={`badge ${
                        task.status === 'completed'
                          ? 'bg-success'
                          : task.status === 'in_progress'
                          ? 'bg-warning text-dark'
                          : 'bg-secondary'
                      }`}>
                        {task.status}
                      </span>
                    </td>

                    <td>{task.due_date || '--'}</td>
                    <td>{task.candidate || '--'}</td>
                    <td>{task.assigned_to_name || '--'}</td>

                    <td>{formatTimeValue(task.time_start) || '--'}</td>
                    <td>{formatTimeValue(task.time_end) || '--'}</td>

                    <td>
                      {(task.task_start_time || task.task_end_time) ? (
                        <>
                          {formatTime(task.task_start_time)} / {formatTime(task.task_end_time)}
                        </>
                      ) : (
                        '-- / --'
                      )}
                    </td>

                    <td>{Number.isFinite(task.duration) && task.duration > 0 ? `${task.duration} mins` : '--'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4">
                      No tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-muted">
              Showing {totalTasks === 0 ? 0 : startIndex + 1} to {endIndex} of {totalTasks}
            </span>

            <div>
              <button
                className="btn btn-outline-secondary btn-sm me-2"
                onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </button>

              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage((previous) => previous + 1)}
                disabled={endIndex >= totalTasks || loading}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger mb-0" role="alert">{error}</div> : null}
    </PageContainer>
  )
}

export default ReportsTasksPage
