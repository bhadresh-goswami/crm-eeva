import { useEffect, useState } from 'react'
import ExpertTaskTable from '../components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'

const ExpertTasksPage = () => {
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getExpertTasks()
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

  return (
    <section style={{ display: 'grid', gap: '1rem' }}>
      <h1 className="page-title">My Tasks</h1>
      <p className="page-description">Task history and current assignments.</p>
      <ExpertTaskTable tasks={tasks} loading={loading} error={error} emptyText="No tasks assigned" />
    </section>
  )
}

export default ExpertTasksPage
