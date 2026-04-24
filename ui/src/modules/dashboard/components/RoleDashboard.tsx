import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import AssignTaskModal from '../../../shared/components/AssignTaskModal'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import DashboardCard from '../../../shared/components/DashboardCard'
import ChartCard from '../../../shared/components/ChartCard'
import PageContainer from '../../../shared/components/PageContainer'
import {
  assignDashboardTask,
  getDashboardTasksByStatus,
  getDashboardExperts,
  getDashboardSummary,
  getDashboardTasksByPaths,
  updateDashboardTaskStatus,
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
  admin: ['/tasks/list', '/dashboard/tasks'],
  manager: ['/tasks/list', '/dashboard/tasks'],
  coordinator: ['/tasks/list', '/dashboard/tasks'],
  expertlead: ['/dashboard/team-tasks'],
  expert: ['/dashboard/my-tasks'],
}

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
    expertsPresent: 0,
    expertsTotal: 0,
  }
}

const toMinutes = (value: string) => {
  if (!value) return null
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return hour * 60 + minute
}

const hasTimeOverlap = (startA: string, endA: string, startB: string, endB: string) => {
  const aStart = toMinutes(startA)
  const aEnd = toMinutes(endA)
  const bStart = toMinutes(startB)
  const bEnd = toMinutes(endB)
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false
  return aStart < bEnd && bStart < aEnd
}

const RoleDashboard = ({ roleLabel, mode }: RoleDashboardProps) => {
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary)
  const [tasks, setTasks] = useState<DashboardTask[]>([])
  const [managerTasksByStatus, setManagerTasksByStatus] = useState<
    Record<'pending' | 'assigned' | 'cancelled' | 'completed', DashboardTask[]>
  >({
    pending: [],
    assigned: [],
    cancelled: [],
    completed: [],
  })
  const [experts, setExperts] = useState<DashboardExpert[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'assigned' | 'cancelled' | 'completed'>('pending')
  const [assigningTask, setAssigningTask] = useState<DashboardTask | null>(null)
  const [viewingTask, setViewingTask] = useState<DashboardTask | null>(null)
  const [cardModal, setCardModal] = useState<{ label: string; tasks: DashboardTask[] } | null>(null)
  const [selectedExpertId, setSelectedExpertId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const allowAssign = mode === 'manager' || mode === 'coordinator'
  const allowStatusUpdate = mode === 'expert' || mode === 'expertlead'

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError(null)

        if (mode === 'manager') {
          const [summaryData, pendingTasks, expertList] = await Promise.all([
            getDashboardSummary(),
            getDashboardTasksByStatus('pending'),
            allowAssign ? getDashboardExperts().catch(() => []) : Promise.resolve([]),
          ])

          if (!mounted) {
            return
          }

          setSummary(summaryData)
          setTasks(pendingTasks)
          setManagerTasksByStatus((previous) => ({ ...previous, pending: pendingTasks }))
          setExperts(expertList)
          return
        }

        const [summaryData, scopedTasks, expertList] = await Promise.all([
          getDashboardSummary().catch(() => null),
          getDashboardTasksByPaths(taskPathsByMode[mode]).catch(() => []),
          allowAssign ? getDashboardExperts().catch(() => []) : Promise.resolve([]),
        ])

        if (!mounted) {
          return
        }

        const computedSummary = summaryFromTasks(scopedTasks, mode === 'admin')

        setSummary(
          summaryData
            ? {
                ...computedSummary,
                ...summaryData,
                totalTasks: summaryData.totalTasks || computedSummary.totalTasks,
                pendingTasks: summaryData.pendingTasks || computedSummary.pendingTasks,
                assignedTasks: summaryData.assignedTasks || computedSummary.assignedTasks,
                completedTasks: summaryData.completedTasks || computedSummary.completedTasks,
              }
            : computedSummary,
        )
        setTasks(scopedTasks)
        setExperts(expertList)
      } catch (loadError) {

        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data from live API.')
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

  const loadManagerTasksByStatus = async (status: 'pending' | 'assigned' | 'cancelled' | 'completed') => {
    if (mode !== 'manager') return

    try {
      setTableLoading(true)
      setError(null)
      const statusTasks = await getDashboardTasksByStatus(status)
      setManagerTasksByStatus((previous) => ({ ...previous, [status]: statusTasks }))
      setTasks(statusTasks)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load selected task status.')
    } finally {
      setTableLoading(false)
    }
  }

  const onTabClick = (status: 'pending' | 'assigned' | 'cancelled' | 'completed') => {
    setActiveTab(status)
    if (mode === 'manager') {
      void loadManagerTasksByStatus(status)
    }
  }

  const filteredTasks = useMemo(() => {
    if (mode === 'admin') {
      return []
    }

    if (mode === 'expert') {
      return tasks
    }

    if (mode === 'manager') {
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
        { label: 'Total Tasks', value: summary.totalTasks },
        { label: 'Pending', value: summary.pendingTasks },
        { label: 'Completed', value: summary.completedTasks },
      ]
    }

    if (mode === 'expertlead') {
      return [
        { label: 'Total Tasks', value: summary.totalTasks },
        { label: 'Pending', value: summary.pendingTasks },
        { label: 'Assigned', value: summary.assignedTasks },
      ]
    }

    return [
      { label: 'Total Tasks', value: summary.totalTasks },
      { label: 'Pending Tasks', value: summary.pendingTasks },
      { label: 'Assigned Tasks', value: summary.assignedTasks },
      ...(mode === 'manager' ? [{ label: 'Total Clients', value: summary.totalClients }] : []),
      { label: 'Experts', value: `${summary.expertsPresent}/${summary.expertsTotal}` },
    ]
  }, [mode, summary])

  const managerCardConfigs = useMemo(
    () => [
      { label: 'Total Tasks', value: summary.totalTasks, status: 'pending' as const, useAll: true },
      { label: 'Pending Tasks', value: summary.pendingTasks, status: 'pending' as const },
      { label: 'Assigned Tasks', value: summary.assignedTasks, status: 'assigned' as const },
      { label: 'Completed Tasks', value: summary.completedTasks, status: 'completed' as const },
      { label: 'Total Clients', value: summary.totalClients, status: 'pending' as const, useAll: true },
      { label: 'Experts', value: `${summary.expertsPresent}/${summary.expertsTotal}`, status: 'pending' as const, useAll: true },
    ],
    [summary],
  )

  const openManagerCardModal = async (label: string, status: 'pending' | 'assigned' | 'cancelled' | 'completed', useAll?: boolean) => {
    if (mode !== 'manager') return
    try {
      setError(null)
      if (useAll) {
        const [pending, assigned, cancelled, completed] = await Promise.all([
          getDashboardTasksByStatus('pending'),
          getDashboardTasksByStatus('assigned'),
          getDashboardTasksByStatus('cancelled'),
          getDashboardTasksByStatus('completed'),
        ])
        setManagerTasksByStatus({ pending, assigned, cancelled, completed })
        setCardModal({
          label,
          tasks: [...pending, ...assigned, ...cancelled, ...completed],
        })
        return
      }

      const fresh = await getDashboardTasksByStatus(status)
      setManagerTasksByStatus((previous) => ({ ...previous, [status]: fresh }))
      setCardModal({ label, tasks: fresh })
    } catch (cardError) {
      setError(cardError instanceof Error ? cardError.message : 'Unable to open task list for this card.')
    }
  }

  const onAssign = async () => {
    if (!assigningTask || !selectedExpertId) {
      return
    }
    if (getManagerExpertAvailability(selectedExpertId) === 'not_available') {
      setError('Selected expert is not available in this time slot.')
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
      setManagerTasksByStatus((previous) => ({
        ...previous,
        pending: previous.pending.filter((task) => task.id !== assigningTask.id),
        assigned: [
          ...previous.assigned,
          { ...assigningTask, status: 'assigned', expertId: selectedExpertId },
        ],
      }))
      setAssigningTask(null)
      setSelectedExpertId('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to assign task.')
    } finally {
      setIsAssigning(false)
    }
  }

  const managerTaskPool = useMemo(
    () => [
      ...managerTasksByStatus.pending,
      ...managerTasksByStatus.assigned,
      ...managerTasksByStatus.cancelled,
      ...managerTasksByStatus.completed,
    ],
    [managerTasksByStatus],
  )

  const getManagerExpertAvailability = (expertId: string) => {
    if (!assigningTask) return 'available'
    const blockingTask = managerTaskPool.find(
      (task) =>
        task.id !== assigningTask.id &&
        task.expertId === expertId &&
        task.status !== 'cancelled' &&
        task.dueDate &&
        assigningTask.dueDate &&
        task.dueDate.slice(0, 10) === assigningTask.dueDate.slice(0, 10) &&
        hasTimeOverlap(task.startTime ?? '', task.endTime ?? '', assigningTask.startTime ?? '', assigningTask.endTime ?? ''),
    )
    return blockingTask ? 'not_available' : 'available'
  }

  const onStatusUpdate = async (task: DashboardTask, status: string) => {
    try {
      setUpdatingTaskId(task.id)
      await updateDashboardTaskStatus(task.id, status)
      setTasks((previous) => previous.map((item) => (item.id === task.id ? { ...item, status } : item)))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update task status.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const tableColSpan = mode === 'manager' ? 7 : allowAssign || allowStatusUpdate ? 7 : 5

  const chartData = [
    { label: 'Pending', value: summary.pendingTasks },
    { label: 'Assigned', value: summary.assignedTasks },
    { label: 'Completed', value: summary.completedTasks },
  ]

  return (
    <PageContainer title={`${roleLabel} Dashboard`} description="Live dashboard summary and task assignment workflow.">
      {error ? <p className="dashboard-notice">{error}</p> : null}

      <div className="metric-grid dashboard-cards section">
        {loading
          ? Array.from({ length: mode === 'admin' ? 4 : 5 }).map((_, index) => (
              <article key={index} className="card skeleton-card" aria-hidden="true" />
            ))
          : mode === 'manager'
            ? managerCardConfigs.map((card) => (
                <DashboardCard
                  key={card.label}
                  title={card.label}
                  value={card.value}
                  trend={card.label.includes('Pending') ? -3 : 6}
                  onClick={() => void openManagerCardModal(card.label, card.status, card.useAll)}
                />
              ))
            : visibleCards.map((card) => (
                <DashboardCard key={card.label} title={card.label} value={card.value} trend={5} />
              ))}
      </div>
      <div className="charts-grid section">
        <ChartCard title="Activity Overview">
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {chartData.map((item) => (
              <div key={item.label}>
                <p className="card-text">{item.label}</p>
                <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb' }}>
                  <div style={{ width: `${Math.min(100, item.value)}%`, height: '100%', borderRadius: 999, background: '#3b82f6' }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <ChartCard title="Tasks Mix (Donut)">
            <p className="card-text">Pending {summary.pendingTasks} • Assigned {summary.assignedTasks}</p>
          </ChartCard>
          <ChartCard title="Completion (Pie)">
            <p className="card-text">Completed {summary.completedTasks} / Total {summary.totalTasks}</p>
          </ChartCard>
        </div>
      </div>

      {mode !== 'admin' ? (
        <>
          {(mode === 'manager' || mode === 'coordinator' || mode === 'expertlead') && (
            <div className="dashboard-tabs" role="tablist" aria-label="Task tabs">
              <button
                type="button"
                role="tab"
                className={`dashboard-tab ${activeTab === 'pending' ? 'dashboard-tab--active' : ''}`}
                onClick={() => onTabClick('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                role="tab"
                className={`dashboard-tab ${activeTab === 'assigned' ? 'dashboard-tab--active' : ''}`}
                onClick={() => onTabClick('assigned')}
              >
                Assigned
              </button>
              {mode === 'manager' ? (
                <>
                  <button
                    type="button"
                    role="tab"
                    className={`dashboard-tab ${activeTab === 'cancelled' ? 'dashboard-tab--active' : ''}`}
                    onClick={() => onTabClick('cancelled')}
                  >
                    Cancelled
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={`dashboard-tab ${activeTab === 'completed' ? 'dashboard-tab--active' : ''}`}
                    onClick={() => onTabClick('completed')}
                  >
                    Completed
                  </button>
                </>
              ) : null}
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
                  {mode === 'manager' ? <th>Actions</th> : null}
                  {allowStatusUpdate ? <th>Update</th> : null}
                  {allowAssign && mode !== 'manager' ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading || tableLoading ? (
                  <tr>
                    <td colSpan={tableColSpan} className="dashboard-empty">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={tableColSpan} className="dashboard-empty">
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
                      {mode === 'manager' ? (
                        <td>
                          <button type="button" className="button users-icon-btn" title="View task details" onClick={() => setViewingTask(task)}>
                            👁
                          </button>
                          <button
                            type="button"
                            className="button users-icon-btn"
                            title={
                              task.status.includes('assign')
                                ? 'Reassign task'
                                : task.status.includes('pending')
                                  ? 'Assign task'
                                  : 'Assign disabled'
                            }
                            disabled={
                              experts.length === 0 ||
                              !task.status.includes('pending') &&
                              !task.status.includes('assign')
                            }
                            onClick={() => {
                              setAssigningTask(task)
                              setSelectedExpertId('')
                            }}
                          >
                            👤
                          </button>
                        </td>
                      ) : null}
                      {allowStatusUpdate ? (
                        <td>
                          <select
                            className="dashboard-status-select"
                            value={task.status}
                            disabled={updatingTaskId === task.id}
                            onChange={(event) => onStatusUpdate(task, event.target.value)}
                          >
                            <option value="pending">pending</option>
                            <option value="assigned">assigned</option>
                            <option value="completed">completed</option>
                          </select>
                        </td>
                      ) : null}
                      {allowAssign && mode !== 'manager' ? (
                        <td>
                          <button
                            type="button"
                            className="button users-icon-btn"
                            title="Assign task"
                            disabled={task.status.includes('assign') || task.status.includes('cancel') || experts.length === 0}
                            onClick={() => {
                              setAssigningTask(task)
                              setSelectedExpertId(experts[0]?.id ?? '')
                            }}
                          >
                            👤
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

      <AssignTaskModal
        isOpen={Boolean(assigningTask)}
        title={assigningTask?.status.includes('assign') ? 'Reassign Task' : 'Assign Task'}
        experts={experts}
        selectedExpertId={selectedExpertId}
        loading={loading}
        submitting={isAssigning}
        error={error}
        onSelect={(expertId) => setSelectedExpertId(String(expertId))}
        getAvailability={(expertId) => getManagerExpertAvailability(String(expertId))}
        onClose={() => {
          setAssigningTask(null)
          setSelectedExpertId('')
        }}
        onConfirm={() => void onAssign()}
        confirmLabel={assigningTask?.status.includes('assign') ? 'Reassign' : 'Assign'}
      />

      <TaskDetailsModal
        isOpen={Boolean(viewingTask)}
        role={mode === 'expert' ? 'expert' : 'admin'}
        task={viewingTask ? {
          taskId: Number(viewingTask.id),
          title: viewingTask.title,
          status: viewingTask.status,
          candidateName: viewingTask.candidate || '—',
          companyName: viewingTask.client || '—',
          supportType: viewingTask.supportType || '—',
          assignedTo: viewingTask.assignedToName || '—',
          dueDate: viewingTask.dueDate,
          startTime: viewingTask.startTime,
          endTime: viewingTask.endTime,
          description: viewingTask.description || '',
        } : null}
        onClose={() => setViewingTask(null)}
      />

      <AnimatedModal isOpen={Boolean(cardModal)} onClose={() => setCardModal(null)} title="Task list">
        <h3 className="modal-title">{cardModal?.label}</h3>
        <div className="roles-table__wrapper dashboard-table-wrap">
          <table className="roles-table dashboard-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Client</th>
                <th>Candidate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(cardModal?.tasks.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="dashboard-empty">No tasks found for this view.</td>
                </tr>
              ) : (
                cardModal?.tasks.map((task) => (
                  <tr key={`${cardModal?.label}-${task.id}`}>
                    <td>{task.title}</td>
                    <td>{task.client}</td>
                    <td>{task.candidate}</td>
                    <td><span className="status-pill">{task.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AnimatedModal>

    </PageContainer>
  )
}

export default RoleDashboard
