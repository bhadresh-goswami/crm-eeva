import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import {
  assignDashboardTask,
  getDashboardExperts,
  getDashboardSummary,
  getDashboardTasksByPaths,
  type DashboardExpert,
  type DashboardSummary,
  type DashboardTask,
} from '../api/dashboardApi'

type DashboardMode = 'admin' | 'manager' | 'coordinator' | 'expertlead' | 'expert'

type RoleDashboardProps = {
  roleLabel: string
  mode: DashboardMode
}

const defaultSummary: DashboardSummary = {
  totalTasks: 0,
  pendingTasks: 0,
  assignedTasks: 0,
  completedTasks: 0,
  totalClients: 0,
  expertsPresent: 0,
  expertsTotal: 0,
}

const taskPathsByMode: Record<DashboardMode, string[]> = {
  admin: [],
  manager: ['/dashboard/tasks', '/dashboard/team-tasks', '/dashboard/my-tasks'],
  coordinator: ['/dashboard/tasks', '/dashboard/team-tasks', '/dashboard/my-tasks'],
  expertlead: ['/dashboard/team-tasks', '/dashboard/my-tasks'],
  expert: ['/dashboard/my-tasks'],
}

const RoleDashboard = ({ roleLabel, mode }: RoleDashboardProps) => {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [experts, setExperts] = useState<DashboardExpert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'assigned'>('pending')
  const [assigningTask, setAssigningTask] = useState<DashboardTask | null>(null)
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const allowAssign = mode === 'manager' || mode === 'coordinator'

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        const summaryPromise = getDashboardSummary().catch(() => defaultSummary)
        const tasksPromise =
          mode === 'admin' ? Promise.resolve([]) : getDashboardTasksByPaths(taskPathsByMode[mode]).catch(() => [])
        const expertsPromise = allowAssign ? getDashboardExperts().catch(() => []) : Promise.resolve([])

        const [summaryData, scopedTasks, expertList] = await Promise.all([
          summaryPromise,
          tasksPromise,
          expertsPromise,
        ])

        if (!mounted) {
          return
        }

        setSummary(summaryData)
        setTasks(scopedTasks)
        setExperts(expertList)

        if (
          summaryData === defaultSummary &&
          scopedTasks.length === 0 &&
          (mode === 'admin' || !allowAssign || expertList.length === 0)
        ) {
          setError('Dashboard API access is restricted for this account (403).')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [allowAssign, mode])

  const filteredTasks = useMemo(() => {
    if (mode === 'admin') {
      return []
    }

    if (mode === 'expert') {
      return tasks
    }

    return tasks.filter((task) => {
      if (activeTab === 'pending') {
        return task.status.includes('pending')
      }

      return task.status.includes('assign') || task.expertId
    })
  }, [activeTab, mode, tasks])

  const visibleCards = useMemo(() => {
    if (mode === 'admin') {
      return [
        { label: 'Total Tasks', value: summary.totalTasks },
        { label: 'Pending Tasks', value: summary.pendingTasks },
        { label: 'Assigned Tasks', value: summary.assignedTasks },
        { label: 'Total Clients', value: summary.totalClients },
      ]
    }

    if (mode === 'expert') {
      return [
        { label: 'Total Tasks', value: summary.totalTasks || tasks.length },
        { label: 'Pending', value: summary.pendingTasks || tasks.filter((task) => task.status === 'pending').length },
        {
          label: 'Completed',
          value: summary.completedTasks || tasks.filter((task) => task.status.includes('complete')).length,
        },
      ]
    }

    if (mode === 'expertlead') {
      return [
        { label: 'Total Tasks', value: summary.totalTasks || tasks.length },
        { label: 'Pending', value: summary.pendingTasks },
        { label: 'Assigned', value: summary.assignedTasks },
      ]
    }

    return [
      { label: 'Total Tasks', value: summary.totalTasks || tasks.length },
      {
        label: 'Pending Tasks',
        value: summary.pendingTasks || tasks.filter((task) => task.status.includes('pending')).length,
      },
      {
        label: 'Assigned Tasks',
        value: summary.assignedTasks || tasks.filter((task) => task.status.includes('assign')).length,
      },
      ...(mode === 'manager' ? [{ label: 'Total Clients', value: summary.totalClients }] : []),
      {
        label: 'Experts',
        value: `${summary.expertsPresent || experts.filter((expert) => expert.isPresent).length}/${summary.expertsTotal || experts.length}`,
      },
    ]
  }, [mode, summary, tasks, experts])

  const onAssign = async () => {
    if (!assigningTask || !selectedExpertId) {
      return
    }

    try {
      setIsAssigning(true)
      await assignDashboardTask(assigningTask.id, selectedExpertId)
      setTasks((previous) =>
        previous.map((task) =>
          task.id === assigningTask.id ? { ...task, status: 'assigned', expertId: selectedExpertId } : task,
        ),
      )
      setAssigningTask(null)
      setSelectedExpertId('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to assign task.')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <section>
      <h2 className="page-title">{roleLabel} Dashboard</h2>
      <p className="page-description">Live dashboard summary and task assignment workflow.</p>
      {error ? <p className="auth-card__error">{error}</p> : null}

      <div className="cards-grid dashboard-cards">
        {loading
          ? Array.from({ length: mode === 'admin' ? 4 : 5 }).map((_, index) => (
              <article key={index} className="card skeleton-card" aria-hidden="true" />
            ))
          : visibleCards.map((card) => (
              <article className="card" key={card.label}>
                <p className="dashboard-card__label">{card.label}</p>
                <h3 className="dashboard-card__value">{card.value}</h3>
              </article>
            ))}
      </div>

      {mode !== 'admin' ? (
        <>
          {(mode === 'manager' || mode === 'coordinator' || mode === 'expertlead') && (
            <div className="dashboard-tabs" role="tablist" aria-label="Task tabs">
              <button
                type="button"
                role="tab"
                className={`dashboard-tab ${activeTab === 'pending' ? 'dashboard-tab--active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                role="tab"
                className={`dashboard-tab ${activeTab === 'assigned' ? 'dashboard-tab--active' : ''}`}
                onClick={() => setActiveTab('assigned')}
              >
                Assigned
              </button>
            </div>
          )}

          <div className="roles-table__wrapper dashboard-table-wrap">
            <table className="roles-table dashboard-table">
              <thead>
                <tr>
                  <th>Task title</th>
                  <th>Client</th>
                  <th>Candidate</th>
                  <th>Schedule time</th>
                  <th>Status</th>
                  {allowAssign ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={allowAssign ? 6 : 5} className="dashboard-empty">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={allowAssign ? 6 : 5} className="dashboard-empty">
                      No tasks found for this view.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.title}</td>
                      <td>{task.client}</td>
                      <td>{task.candidate}</td>
                      <td>{task.scheduleTime}</td>
                      <td>
                        <span className="status-pill">{task.status}</span>
                      </td>
                      {allowAssign ? (
                        <td>
                          <button
                            type="button"
                            className="button"
                            disabled={task.status.includes('assign') || experts.length === 0}
                            onClick={() => {
                              setAssigningTask(task)
                              setSelectedExpertId(experts[0]?.id ?? '')
                            }}
                          >
                            👤 Assign
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="page-description">System overview only for admin users.</p>
      )}

      <AnimatedModal
        isOpen={Boolean(assigningTask)}
        onClose={() => setAssigningTask(null)}
        title="Assign task"
      >
        <h3 className="modal-title">Assign task to expert</h3>
        <p className="page-description">Task: {assigningTask?.title}</p>
        <div className="modal-form">
          <label className="auth-card__field">
            Expert
            <select value={selectedExpertId} onChange={(event) => setSelectedExpertId(event.target.value)}>
              {experts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name} {expert.isPresent ? '(Present)' : '(Away)'}
                </option>
              ))}
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="button" onClick={() => setAssigningTask(null)}>
              Cancel
            </button>
            <button type="button" className="button button--primary" disabled={isAssigning} onClick={onAssign}>
              {isAssigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </AnimatedModal>
    </section>
  )
}

export default RoleDashboard
