import { useEffect, useState } from 'react'
import ExpertTaskTable from '../components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'
import { useAuth } from '../../../context/AuthContext'

const ExpertTasksPage = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <h1 className="page-title">My Tasks</h1>
      <p className="page-description">Task history and current assignments (including visible sub-user tasks).</p>
      <ExpertTaskTable
        tasks={tasks}
        loading={loading}
        error={error}
        emptyText="No active tasks available"
        currentUserId={Number(user?.id ?? 0)}
        onTaskUpdated={loadTasks}
      />
    </section>
  )
}

export default ExpertTasksPage
