import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../../api/client'

type ExpertTask = {
  task_id: number
  title: string
  description: string
  due_date: string
  start_time: string
  end_time: string
  status_id: number
}

const statusById: Record<number, string> = {
  1: 'Pending',
  2: 'Assigned',
  3: 'Completed',
}

const normalizeTask = (item: Record<string, unknown>): ExpertTask | null => {
  const taskId = Number(item.task_id)
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return null
  }

  return {
    task_id: taskId,
    title: String(item.title ?? '').trim(),
    description: String(item.description ?? '').trim(),
    due_date: String(item.due_date ?? '').trim(),
    start_time: String(item.start_time ?? '').trim(),
    end_time: String(item.end_time ?? '').trim(),
    status_id: Number(item.status_id) || 0,
  }
}

const formatDate = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatTime = (value: string) => (value ? value.slice(0, 5) : '—')

const ExpertDashboard = () => {
  const [tasks, setTasks] = useState<ExpertTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadTasks = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiRequest<{ success?: boolean; data?: unknown[] }>('/expert/tasks')
        const list = Array.isArray(response?.data) ? response.data : []
        const normalized = list
          .map((item) => (item && typeof item === 'object' ? normalizeTask(item as Record<string, unknown>) : null))
          .filter((item): item is ExpertTask => Boolean(item))

        if (!mounted) return
        setTasks(normalized)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : 'Unable to fetch assigned tasks.')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadTasks()

    return () => {
      mounted = false
    }
  }, [])

  const rows = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      status: statusById[task.status_id] ?? 'Pending',
    }))
  }, [tasks])

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <h1 className="page-title">Technical Expert Dashboard</h1>
      <p className="page-description">View tasks assigned to you.</p>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? <p className="card-text">Loading tasks...</p> : null}
        {error ? <p className="auth-card__error">{error}</p> : null}

        {!loading && !error && rows.length === 0 ? <p className="card-text">No tasks assigned</p> : null}

        {!loading && !error && rows.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '0.6rem', borderBottom: '1px solid #e5e7eb' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr key={task.task_id}>
                  <td style={{ padding: '0.6rem', borderBottom: '1px solid #f3f4f6' }}>{task.title || '—'}</td>
                  <td style={{ padding: '0.6rem', borderBottom: '1px solid #f3f4f6' }}>{formatDate(task.due_date)}</td>
                  <td style={{ padding: '0.6rem', borderBottom: '1px solid #f3f4f6' }}>
                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                  </td>
                  <td style={{ padding: '0.6rem', borderBottom: '1px solid #f3f4f6' }}>{task.status}</td>
                  <td style={{ padding: '0.6rem', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button type="button" className="button" title={task.description || 'View task'}>
                      👁
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  )
}

export default ExpertDashboard
