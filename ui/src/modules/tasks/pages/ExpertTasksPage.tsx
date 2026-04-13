import { useEffect, useMemo, useState } from 'react'
import { getExpertTasks, updateExpertTaskStatus, type ExpertTaskItem } from '../api/expertTasksApi'

const formatDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatTime = (value: string) => (value ? value.slice(0, 5) : '—')

const normalizeStatus = (statusName: string, statusId: number) => {
  const value = statusName.toLowerCase()
  if (value.includes('complete')) return 'Completed'
  if (value.includes('progress')) return 'In Progress'
  if (value.includes('assign')) return 'Pending'
  if (statusId === 3) return 'Completed'
  if (statusId === 2) return 'In Progress'
  return 'Pending'
}

const ExpertTasksPage = () => {
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<ExpertTaskItem | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)

  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getExpertTasks()
      setTasks(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
  }, [])

  const visibleTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        display_status: normalizeStatus(task.status_name, task.status_id),
      })),
    [tasks],
  )

  const onStatusUpdate = async (task: ExpertTaskItem, action: 'start' | 'end') => {
    try {
      setUpdatingTaskId(task.task_id)
      await updateExpertTaskStatus(task.task_id, action)
      await loadTasks()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update task.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <h1 className="page-title">My Tasks</h1>
      <p className="page-description">Only candidate and task details are visible.</p>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p className="card-text">Loading tasks...</p> : null}
        {error ? <p className="auth-card__error">{error}</p> : null}
        {!loading && !error && visibleTasks.length === 0 ? <p className="card-text">No tasks assigned</p> : null}

        {!loading && !error && visibleTasks.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Candidate</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Task</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '0.65rem', borderBottom: '1px solid #e5e7eb' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <tr key={task.task_id}>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>{task.candidate_name || '—'}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>{task.title || '—'}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>{formatDate(task.due_date)}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>
                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                  </td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6' }}>{task.display_status}</td>
                  <td style={{ padding: '0.65rem', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button className="button" type="button" onClick={() => setSelectedTask(task)} title="View task details">
                      👁
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {selectedTask ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.45)',
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
            zIndex: 50,
          }}
        >
          <div className="card" style={{ width: 'min(900px, 100%)', display: 'grid', gap: '1rem' }}>
            <h2 style={{ margin: 0 }}>Task Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              <p><strong>Candidate:</strong> {selectedTask.candidate_name || '—'}</p>
              <p><strong>Status:</strong> {normalizeStatus(selectedTask.status_name, selectedTask.status_id)}</p>
              <p><strong>Task:</strong> {selectedTask.title || '—'}</p>
              <p><strong>Date:</strong> {formatDate(selectedTask.due_date)}</p>
              <p><strong>Time:</strong> {formatTime(selectedTask.start_time)} - {formatTime(selectedTask.end_time)}</p>
            </div>
            <p><strong>Description:</strong> {selectedTask.description || '—'}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="button" onClick={() => setSelectedTask(null)}>
                Close
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {normalizeStatus(selectedTask.status_name, selectedTask.status_id) === 'Pending' ? (
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={updatingTaskId === selectedTask.task_id}
                    onClick={() => void onStatusUpdate(selectedTask, 'start')}
                  >
                    Start
                  </button>
                ) : null}

                {normalizeStatus(selectedTask.status_name, selectedTask.status_id) === 'In Progress' ? (
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={updatingTaskId === selectedTask.task_id}
                    onClick={() => void onStatusUpdate(selectedTask, 'end')}
                  >
                    End
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ExpertTasksPage
