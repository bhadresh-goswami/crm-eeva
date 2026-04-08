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
  expertlead: ['/dashboard/team-tasks', '/dashboard/tasks', '/dashboard/my-tasks'],
  expert: ['/dashboard/my-tasks', '/dashboard/tasks', '/dashboard/team-tasks'],
}

const demoTasksByMode: Record<DashboardMode, DashboardTask[]> = {
  admin: [],
  manager: [
    {
      id: 'demo-manager-1',
      title: 'React Interview - Frontend Engineer',
      client: 'Bedge Tech Inc',
      candidate: 'Rakesh Sharma',
      scheduleTime: '2026-04-09 10:30 AM',
      status: 'pending',
      expertId: null,
    },
    {
      id: 'demo-manager-2',
      title: 'Node.js Round - Full Stack Engineer',
      client: 'Bsquare',
      candidate: 'Priya Nair',
      scheduleTime: '2026-04-09 02:00 PM',
      status: 'assigned',
      expertId: 'demo-expert-1',
    },
  ],
  coordinator: [
    {
      id: 'demo-coord-1',
      title: 'Java L2 Interview',
      client: 'Bedge Tech Inc',
      candidate: 'Naveen Kumar',
      scheduleTime: '2026-04-10 11:00 AM',
      status: 'pending',
      expertId: null,
    },
    {
      id: 'demo-coord-2',
      title: 'Python API Interview',
      client: 'Bsquare',
      candidate: 'Megha Singh',
      scheduleTime: '2026-04-10 03:30 PM',
      status: 'assigned',
      expertId: 'demo-expert-2',
    },
  ],
  expertlead: [
    {
      id: 'demo-lead-1',
      title: 'Architecture Review Round',
      client: 'Bedge Tech Inc',
      candidate: 'Sarthak Jain',
      scheduleTime: '2026-04-11 09:30 AM',
      status: 'pending',
      expertId: null,
    },
    {
      id: 'demo-lead-2',
      title: 'Microservices Deep Dive',
      client: 'Bsquare',
      candidate: 'Anita Das',
      scheduleTime: '2026-04-11 01:00 PM',
      status: 'assigned',
      expertId: 'demo-expert-1',
    },
  ],
  expert: [
    {
      id: 'demo-expert-task-1',
      title: 'Technical Expert Round - React',
      client: 'Bedge Tech Inc',
      candidate: 'Aman Verma',
      scheduleTime: '2026-04-09 12:00 PM',
      status: 'pending',
      expertId: 'self',
    },
    {
      id: 'demo-expert-task-2',
      title: 'System Design Round',
      client: 'Bsquare',
      candidate: 'Divya Rao',
      scheduleTime: '2026-04-10 04:00 PM',
      status: 'completed',
      expertId: 'self',
    },
  ],
}

const demoExperts: DashboardExpert[] = [
  { id: 'demo-expert-1', name: 'expert1', isPresent: true },
  { id: 'demo-expert-2', name: 'expert2', isPresent: true },
  { id: 'demo-expert-3', name: 'Kishan Parekh', isPresent: false },
]

const summaryFromTasks = (tasks: DashboardTask[], includeClients: boolean): DashboardSummary => {
  const pending = tasks.filter((task) => task.status.includes('pending')).length
  const assigned = tasks.filter((task) => task.status.includes('assign')).length
  const completed = tasks.filter((task) => task.status.includes('complete')).length

  return {
    totalTasks: tasks.length,
    pendingTasks: pending,
    assignedTasks: assigned,
    completedTasks: completed,
    totalClients: includeClients ? new Set(tasks.map((task) => task.client)).size : 0,
    expertsPresent: demoExperts.filter((expert) => expert.isPresent).length,
    expertsTotal: demoExperts.length,
  }
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

        const summaryPromise = getDashboardSummary().catch(() => null)
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

        const hasLiveData = Boolean(summaryData) || scopedTasks.length > 0 || expertList.length > 0

        if (!hasLiveData) {
          const fallbackTasks = demoTasksByMode[mode]
          const fallbackExperts = allowAssign ? demoExperts : []
          const fallbackSummary = summaryFromTasks(fallbackTasks, mode === 'manager' || mode === 'admin')

          setSummary(fallbackSummary)
          setTasks(fallbackTasks)
          setExperts(fallbackExperts)
          setError('Live dashboard API is restricted. Showing demo dashboard data.')
          return
        }

        setSummary(summaryData ?? summaryFromTasks(scopedTasks, mode === 'manager' || mode === 'admin'))
        setTasks(scopedTasks)
        setExperts(expertList)
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
    } catch {
      setTasks((previous) =>
        previous.map((task) =>
          task.id === assigningTask.id ? { ...task, status: 'assigned', expertId: selectedExpertId } : task,
        ),
      )
      setAssigningTask(null)
      setSelectedExpertId('')
      setError('Assignment saved in demo mode. API assignment endpoint is currently restricted.')
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <section>
      <h2 className="page-title">{roleLabel} Dashboard</h2>
      <p className="page-description">Live dashboard summary and task assignment workflow.</p>
      {error ? <p className="dashboard-notice">{error}</p> : null}

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
