import { useEffect, useState } from 'react'
import ExpertTaskTable from '../../tasks/components/ExpertTaskTable'
import { getExpertTasks, type ExpertTaskItem } from '../../tasks/api/expertTasksApi'

const ExpertDashboard = () => {
  const [tasks, setTasks] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await getExpertTasks({ activeOnly: true })
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
      <h1 className="page-title">Technical Expert Dashboard</h1>
      <p className="page-description">Active assigned tasks only.</p>
      <ExpertTaskTable tasks={tasks} loading={loading} error={error} emptyText="No active tasks assigned" />
    </section>
  )
}

export default ExpertDashboard
