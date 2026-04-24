import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import { useAlert } from '../../../shared/alerts/useAlert'
import ChartCard from '../../../shared/components/ChartCard'
import DashboardCard from '../../../shared/components/DashboardCard'
import PageContainer from '../../../shared/components/PageContainer'
import {
  assignManagerTask,
  getManagerAvailableExperts,
  getManagerDashboardSummary,
  getManagerTasksByStatus,
  type DashboardExpert,
  type DashboardSummary,
  type DashboardTask,
  type ManagerTaskStatus,
} from '../api/dashboardApi'

const defaultSummary: DashboardSummary = {
  totalTasks: 0,
  pendingTasks: 0,
  assignedTasks: 0,
  completedTasks: 0,
  cancelledTasks: 0,
  totalClients: 0,
  expertsPresent: 0,
  expertsTotal: 0,
}

const tabLabels: Record<ManagerTaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const formatToAmPm = (value?: string) => {
  if (!value) return '—'
  const normalized = value.length >= 5 ? value.slice(0, 5) : value
  const date = new Date(`1970-01-01T${normalized}:00`)
  if (Number.isNaN(date.getTime())) return normalized
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

const ManagerDashboard = () => {
  const { showToast, showAlert } = useAlert()
  const [summaryData, setSummaryData] = useState<DashboardSummary>(defaultSummary)
  const [tasksData, setTasksData] = useState<DashboardTask[]>([])
  const [liveTasks, setLiveTasks] = useState<DashboardTask[]>([])
  const [activeTab, setActiveTab] = useState<ManagerTaskStatus>('pending')
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true)
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [tasksError, setTasksError] = useState<string | null>(null)

  const [assigningTask, setAssigningTask] = useState<DashboardTask | null>(null)
  const [availableExperts, setAvailableExperts] = useState<DashboardExpert[]>([])
  const [loadingExperts, setLoadingExperts] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [selectedExpertId, setSelectedExpertId] = useState<string>('')
  const [submittingAssign, setSubmittingAssign] = useState(false)
  const isAssignModalOpen = Boolean(assigningTask)

  const [detailTask, setDetailTask] = useState<DashboardTask | null>(null)

  const loadSummary = async () => {
    try {
      setLoadingSummary(true)
      setSummaryError(null)
      const response = await getManagerDashboardSummary()
      setSummaryData(response)
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Unable to load summary data.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadTasksByStatus = async (status: ManagerTaskStatus) => {
    try {
      setLoadingTasks(true)
      setTasksError(null)
      const response = await getManagerTasksByStatus(status)
      setTasksData(response)
    } catch (error) {
      setTasksError(error instanceof Error ? error.message : 'Unable to load tasks for this tab.')
      setTasksData([])
    } finally {
      setLoadingTasks(false)
    }
  }

  const loadLiveTasks = async () => {
    try {
      const statuses: ManagerTaskStatus[] = ['assigned', 'pending', 'completed', 'cancelled']
      const grouped = await Promise.all(statuses.map((status) => getManagerTasksByStatus(status)))
      const merged = grouped.flat()
      const unique = Array.from(new Map(merged.map((task) => [task.id, task])).values())
      unique.sort((a, b) => Number(b.id) - Number(a.id))
      setLiveTasks(unique)
    } catch {
      setLiveTasks([])
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  useEffect(() => {
    void loadTasksByStatus(activeTab)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'pending' && summaryData.pendingTasks === 0 && summaryData.assignedTasks > 0) {
      setActiveTab('assigned')
    }
  }, [activeTab, summaryData.assignedTasks, summaryData.pendingTasks])

  useEffect(() => {
    void loadLiveTasks()
  }, [])

  useEffect(() => {
    const isUserBusy = Boolean(assigningTask) || Boolean(detailTask)
    const interval = window.setInterval(() => {
      if (isUserBusy) return
      void loadTasksByStatus(activeTab)
      void loadSummary()
      void loadLiveTasks()
    }, 10_000)

    return () => window.clearInterval(interval)
  }, [activeTab, assigningTask, detailTask])

  useEffect(() => {
    let mounted = true

    const loadExperts = async () => {
      if (!isAssignModalOpen || !assigningTask) {
        setAvailableExperts([])
        setAssignError(null)
        setSelectedExpertId('')
        return
      }

      try {
        setLoadingExperts(true)
        setAssignError(null)
        const response = await getManagerAvailableExperts({
          taskDate: assigningTask.dueDate ?? '',
          startTime: assigningTask.startTime ?? '',
          endTime: assigningTask.endTime ?? '',
        })

        if (!mounted) return

        setAvailableExperts(Array.isArray(response) ? response : [])
        setSelectedExpertId('')
      } catch (error) {
        if (!mounted) return
        setAssignError(error instanceof Error ? error.message : 'Unable to load experts.')
        setAvailableExperts([])
      } finally {
        if (mounted) {
          setLoadingExperts(false)
        }
      }
    }

    void loadExperts()

    return () => {
      mounted = false
    }
  }, [assigningTask, isAssignModalOpen])

  const cards = useMemo(
    () => [
      { label: 'Total Tasks', value: summaryData.totalTasks },
      { label: 'Pending Tasks', value: summaryData.pendingTasks, tab: 'pending' as const },
      { label: 'Assigned Tasks', value: summaryData.assignedTasks, tab: 'assigned' as const },
      { label: 'Cancelled Tasks', value: summaryData.cancelledTasks ?? 0, tab: 'cancelled' as const },
      { label: 'Total Clients', value: summaryData.totalClients },
      { label: 'Experts', value: summaryData.expertsTotal },
    ],
    [summaryData],
  )

  const getActionConfig = (status: string) => {
    if (status === 'pending') return { label: 'Assign', disabled: false }
    if (status === 'assigned') return { label: 'Reassign', disabled: false }
    return { label: 'Assign', disabled: true }
  }

  const handleAssign = async () => {
    if (!assigningTask || !selectedExpertId) return

    try {
      setSubmittingAssign(true)
      setAssignError(null)
      const response = await assignManagerTask(assigningTask.id, selectedExpertId)
      showToast({ type: 'success', message: 'Task assigned successfully.' })
      if (response?.email_status === 'failed') {
        showToast({ type: 'warning', message: 'Task assigned but email failed.' })
      }
      setAssigningTask(null)
      setSelectedExpertId('')
      await loadTasksByStatus(activeTab)
      await loadSummary()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to assign task.'
      setAssignError(message)
      showAlert({ type: 'error', title: 'Assignment failed', message })
    } finally {
      setSubmittingAssign(false)
    }
  }


  return (
    <PageContainer title="Manager Dashboard" description="Live dashboard summary and task assignment workflow.">

      <div className="metric-grid dashboard-cards section">
        {loadingSummary
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="card skeleton-card" aria-hidden="true" />
            ))
          : cards.map((card) => {
              if (!card.tab) {
                return (
                  <DashboardCard key={card.label} title={card.label} value={card.value} trend={4} />
                )
              }

              return (
                <DashboardCard key={card.label} title={card.label} value={card.value} trend={card.tab === 'cancelled' ? -2 : 5} onClick={() => setActiveTab(card.tab)} />
              )
            })}
      </div>
      <div className="charts-grid section">
        <ChartCard title="Task Activity">
          <p className="card-text">Pending {summaryData.pendingTasks} • Assigned {summaryData.assignedTasks} • Completed {summaryData.completedTasks}</p>
        </ChartCard>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <ChartCard title="Donut">
            <p className="card-text">Experts {summaryData.expertsPresent}/{summaryData.expertsTotal}</p>
          </ChartCard>
          <ChartCard title="Pie">
            <p className="card-text">Cancelled {summaryData.cancelledTasks}</p>
          </ChartCard>
        </div>
      </div>
      <aside className="activity-panel section">
        <h3 className="tasks-activity__title">Live Activity</h3>
        {liveTasks.length === 0 ? <p className="card-text">No tasks found.</p> : null}
        {liveTasks.slice(0, 4).map((task) => (
          <div className="activity-item" key={`activity-${task.id}`}>
            <span className="dot" />
            <div>
              <p className="name">{task.title}</p>
              <p className="email">{task.status} • {task.assignedToName || 'Unassigned'}</p>
            </div>
          </div>
        ))}
      </aside>
      {summaryError ? <p className="dashboard-notice">{summaryError}</p> : null}

      <div className="dashboard-tabs" role="tablist" aria-label="Task tabs">
        {(Object.keys(tabLabels) as ManagerTaskStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            className={`dashboard-tab ${activeTab === status ? 'dashboard-tab--active' : ''}`}
            aria-selected={activeTab === status}
            onClick={() => setActiveTab(status)}
          >
            {tabLabels[status]}
          </button>
        ))}
      </div>

      {tasksError ? <p className="dashboard-notice">{tasksError}</p> : null}

      <div className="roles-table__wrapper dashboard-table-wrap">
        <table className="roles-table dashboard-table">
          <thead>
            <tr>
              <th>SR No</th>
              <th>Title</th>
              <th>Candidate</th>
              <th>Company</th>
              <th>Time</th>
              <th>Status</th>
              <th>Assign To</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingTasks ? (
              <tr>
                <td colSpan={9} className="dashboard-empty">Loading tasks...</td>
              </tr>
            ) : tasksData.length === 0 ? (
              <tr>
                <td colSpan={9} className="dashboard-empty">No tasks found</td>
              </tr>
            ) : (
              tasksData.map((task, index) => {
                const action = getActionConfig(task.status)
                return (
                  <tr key={task.id}>
                    <td>{index + 1}</td>
                    <td>{task.title}</td>
                    <td>{task.candidate || '—'}</td>
                    <td>{task.client || '—'}</td>
                    <td>{task.startTime && task.endTime ? `${formatToAmPm(task.startTime)} - ${formatToAmPm(task.endTime)}` : task.scheduleTime || '—'}</td>
                    <td><span className="status-pill">{task.status}</span></td>
                    <td>{task.assignedToName || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="button users-icon-btn action-btn"
                        title="View task details"
                        aria-label="View task details"
                        onClick={() => setDetailTask(task)}
                      >
                        👁
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button users-icon-btn action-btn"
                        disabled={action.disabled}
                        title={action.label === 'Reassign' ? 'Reassign task' : 'Assign task'}
                        aria-label={action.label === 'Reassign' ? 'Reassign task' : 'Assign task'}
                        onClick={() => setAssigningTask(task)}
                      >
                        👤
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <AnimatedModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setAssigningTask(null)
          setSelectedExpertId('')
        }}
        title={assigningTask?.status === 'assigned' ? '🧑‍💻 Reassign Expert' : '🧑‍💻 Assign Expert'}
      >
        <h3 className="modal-title">{assigningTask?.status === 'assigned' ? '🧑‍💻 Reassign Expert' : '🧑‍💻 Assign Expert'}</h3>
        {loadingExperts ? (
          <p className="card-text">Loading experts...</p>
        ) : (
          <div className="roles-table__wrapper" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <table className="roles-table">
              <thead>
                <tr>
                  <th>Expert Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(availableExperts) && availableExperts.length > 0 ? (
                  availableExperts.map((expert) => (
                    <tr key={expert.id}>
                      <td>{expert.name}</td>
                      <td>
                        {expert.status === 'available' ? (
                          <span className="status-pill status-pill--active">🟢 Available</span>
                        ) : (
                          <span className="status-pill status-pill--cancelled">🔴 Busy</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="button users-icon-btn action-btn"
                          disabled={expert.status !== 'available'}
                          title={
                            expert.status === 'available'
                              ? selectedExpertId === expert.id
                                ? 'Selected expert'
                                : 'Select expert'
                              : 'Expert unavailable'
                          }
                          aria-label={
                            expert.status === 'available'
                              ? selectedExpertId === expert.id
                                ? 'Selected expert'
                                : 'Select expert'
                              : 'Expert unavailable'
                          }
                          onClick={() => setSelectedExpertId(expert.id)}
                        >
                          {expert.status === 'available' ? (selectedExpertId === expert.id ? '✅' : '✔️') : '⛔'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="dashboard-empty">⚠️ No experts available for selected time</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {assignError ? <p className="auth-card__error">{assignError}</p> : null}
        <div className="modal-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              setAssigningTask(null)
              setSelectedExpertId('')
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={loadingExperts || submittingAssign || !selectedExpertId}
            onClick={() => void handleAssign()}
          >
            {submittingAssign ? 'Submitting...' : assigningTask?.status === 'assigned' ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </AnimatedModal>

      <TaskDetailsModal
        isOpen={Boolean(detailTask)}
        role="manager"
        task={detailTask ? {
          taskId: Number(detailTask.id),
          title: detailTask.title,
          status: detailTask.status,
          candidateName: detailTask.candidate || '—',
          companyName: detailTask.client || '—',
          supportType: detailTask.supportType || '—',
          assignedTo: detailTask.assignedToName || '—',
          dueDate: detailTask.dueDate,
          startTime: detailTask.startTime,
          endTime: detailTask.endTime,
          description: detailTask.description || '',
        } : null}
        onClose={() => setDetailTask(null)}
      />
    </PageContainer>
  )
}

export default ManagerDashboard
