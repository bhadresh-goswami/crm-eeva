import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import { useAlert } from '../../../shared/alerts/useAlert'
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
import { getTasksLastUpdate } from '../../tasks/api/tasksApi'

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

const isOverdueTask = (task: DashboardTask) => {
  if (!task.dueDate) return false
  const due = new Date(task.dueDate.slice(0, 10))
  const today = new Date()
  due.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return due < today && !['completed', 'cancelled'].includes(task.status)
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
  const [lastKnownTaskUpdate, setLastKnownTaskUpdate] = useState<string | null>(null)

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
    const interval = window.setInterval(async () => {
      if (isUserBusy) return
      try {
        const latestStamp = await getTasksLastUpdate()
        if (!latestStamp || latestStamp === lastKnownTaskUpdate) {
          return
        }
        setLastKnownTaskUpdate(latestStamp)
        await Promise.all([loadTasksByStatus(activeTab), loadSummary(), loadLiveTasks()])
      } catch {
        // ignore polling errors
      }
    }, 20_000)

    return () => window.clearInterval(interval)
  }, [activeTab, assigningTask, detailTask, lastKnownTaskUpdate])

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

  const kpi = useMemo(() => {
    const overdue = liveTasks.filter(isOverdueTask).length
    const today = new Date().toISOString().slice(0, 10)
    const completedToday = liveTasks.filter((task) => task.status === 'completed' && task.dueDate?.slice(0, 10) === today).length
    const productiveBase = summaryData.pendingTasks + summaryData.assignedTasks + summaryData.completedTasks
    const productivity = productiveBase > 0 ? Math.round((summaryData.completedTasks / productiveBase) * 100) : 0
    const durations = liveTasks.map((task) => Number((task as { duration?: number }).duration ?? 0)).filter((value) => Number.isFinite(value) && value > 0)
    const avgDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const totalLast30Days = liveTasks.filter((task) => {
      if (!task.dueDate) return false
      const source = task.dueDate || ''
      const date = new Date(String(source).slice(0, 10))
      return !Number.isNaN(date.getTime()) && date >= last30Days
    }).length
    return { overdue, completedToday, productivity, avgDuration, totalLast30Days }
  }, [liveTasks, summaryData.assignedTasks, summaryData.completedTasks, summaryData.pendingTasks])

  const cards = useMemo(
    () => [
      { label: 'Total Revenue', value: `₹${liveTasks.reduce((sum, task) => sum + Number(task.amount ?? 0), 0).toFixed(0)}`, tone: 'success' },
      { label: 'Completed Tasks', value: summaryData.completedTasks, tab: 'completed' as const, tone: 'success' },
      { label: 'Pending Tasks', value: summaryData.pendingTasks, tab: 'pending' as const, tone: 'warning' },
      { label: 'Pending Payments', value: summaryData.pendingPaymentUpdates ?? 0, tone: 'danger' },
      { label: 'Success Rate', value: `${kpi.productivity}%`, tone: 'default' },
    ],
    [kpi.productivity, liveTasks, summaryData.completedTasks, summaryData.pendingPaymentUpdates, summaryData.pendingTasks],
  )

  const pendingPaymentRows = useMemo(() => liveTasks
    .filter((task) => task.status === 'completed' && (Number(task.amount ?? 0) <= 0 || (task.paymentStatus ?? '') === 'pending'))
    .slice(0, 10), [liveTasks])

  const liveActivityTasks = useMemo(
    () => liveTasks.filter((task) => ['pending', 'assigned'].includes(task.status)).slice(0, 6),
    [liveTasks],
  )

  const criticalAlerts = useMemo(() => {
    const now = new Date()
    const in30 = new Date(now.getTime() + 30 * 60 * 1000)
    const upcoming = liveTasks.filter((task) => {
      if (!task.dueDate || !task.startTime || ['completed', 'cancelled'].includes(task.status)) return false
      const ts = new Date(`${task.dueDate.slice(0, 10)}T${task.startTime.slice(0, 5)}:00`)
      return ts >= now && ts <= in30
    })
    const unassigned = liveTasks.filter((task) => !task.assignedToName || task.assignedToName === 'Unassigned')
    const overdue = liveTasks.filter(isOverdueTask)
    return { overdue, upcoming, unassigned }
  }, [liveTasks])

  const teamWorkload = useMemo(() => {
    const map = new Map<string, { assigned: number; pending: number; overdue: number }>()
    liveTasks.forEach((task) => {
      const owner = task.assignedToName?.trim() || 'Unassigned'
      const row = map.get(owner) ?? { assigned: 0, pending: 0, overdue: 0 }
      if (task.status === 'assigned') row.assigned += 1
      if (task.status === 'pending') row.pending += 1
      if (isOverdueTask(task)) row.overdue += 1
      map.set(owner, row)
    })
    return Array.from(map.entries()).map(([name, row]) => {
      const total = row.assigned + row.pending + row.overdue
      const load = Math.min(100, total * 20)
      return { name, ...row, load }
    })
  }, [liveTasks])

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

      <div className="row g-3 section">
        {loadingSummary
          ? Array.from({ length: cards.length || 6 }).map((_, index) => (
              <article key={index} className="col-12 col-md-6 col-xl-3 card skeleton-card" aria-hidden="true" />
            ))
          : cards.map((card) => {
              if (!card.tab) {
                return (
                  <div key={card.label} className={`col-12 col-md-6 col-xl-3 card metric-card metric-card--${card.tone}`}>
                    <span className="metric-card__title">{card.label}</span>
                    <h3 className="metric-card__value">{card.value}</h3>
                  </div>
                )
              }

              return (
                <button key={card.label} type="button" className={`col-12 col-md-6 col-xl-3 card metric-card metric-card--button metric-card--${card.tone}`} onClick={() => setActiveTab(card.tab)}>
                  <span className="metric-card__title">{card.label}</span>
                  <h3 className="metric-card__value">{card.value}</h3>
                </button>
              )
            })}
      </div>
      <div className="card section">
        <h3 className="tasks-activity__title">Pending Payments</h3>
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead><tr><th>Date</th><th>Client</th><th>Candidate</th><th>Amount</th><th>Status</th><th>Duration</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingPaymentRows.length === 0 ? <tr><td colSpan={7}>No pending payments.</td></tr> : pendingPaymentRows.map((task) => (
                <tr key={`pending-${task.id}`}>
                  <td>{task.dueDate?.slice(0, 10) || '-'}</td>
                  <td>{task.client || '-'}</td>
                  <td>{task.candidate || '-'}</td>
                  <td>₹{Number(task.amount ?? 0)}</td>
                  <td><span className={`badge ${(task.paymentStatus ?? 'pending') === 'paid' ? 'text-bg-success' : 'text-bg-warning'}`}>{task.paymentStatus || 'pending'}</span></td>
                  <td>{task.duration ? `${task.duration} mins` : '-'}</td>
                  <td className="d-flex gap-2"><button className="btn btn-sm btn-light" onClick={() => setDetailTask(task)}>👁️</button><button className="btn btn-sm btn-light" onClick={() => setActiveTab('completed')}>✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card section">
        <h3 className="tasks-activity__title">Critical Alerts</h3>
        <p className="card-text">Overdue: {criticalAlerts.overdue.length} • Upcoming (30m): {criticalAlerts.upcoming.length} • Unassigned: {criticalAlerts.unassigned.length}</p>
      </div>

      <div className="card section">
        <h3 className="tasks-activity__title">Team Workload</h3>
        <div className="roles-table__wrapper">
          <table className="roles-table">
            <thead><tr><th>Coordinator</th><th>Assigned</th><th>Pending</th><th>Overdue</th><th>Load %</th></tr></thead>
            <tbody>
              {teamWorkload.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td><td>{row.assigned}</td><td>{row.pending}</td><td>{row.overdue}</td>
                  <td><div style={{ background: '#e5e7eb', borderRadius: 999, height: 8 }}><div style={{ width: `${row.load}%`, height: '100%', borderRadius: 999, background: row.load > 80 ? '#ef4444' : '#3b82f6' }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card section">
        <h3 className="tasks-activity__title">Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" type="button" onClick={() => (window.location.href = '/tasks')}>Create Task</button>
          <button className="button" type="button" onClick={() => setActiveTab('assigned')}>Bulk Assign</button>
          <button className="button" type="button" onClick={() => setActiveTab('assigned')}>Reassign Tasks</button>
          <button className="button" type="button" onClick={() => window.print()}>Export Data</button>
        </div>
      </div>
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

      <div className="manager-dashboard-layout">
        <aside className="activity-panel section">
          <div className="activity-panel__header">
            <h3 className="tasks-activity__title">Live Activity Feed</h3>
            <span className="activity-live"><span className="activity-live__dot" /> Live</span>
          </div>
          {liveActivityTasks.length === 0 ? <p className="card-text">No live tasks running.</p> : null}
          <div className="activity-timeline">
            {liveActivityTasks.map((task) => (
              <article className="activity-timeline__item" key={`activity-${task.id}`}>
                <span className="activity-timeline__dot" />
                <div className="activity-timeline__card">
                  <p className="activity-timeline__title">{task.candidate || 'Candidate'} → {task.client || 'Company'} → Assigned to {task.assignedToName || 'Unassigned'} at {task.startTime ? formatToAmPm(task.startTime) : '—'}</p>
                  <p className="activity-timeline__meta">{task.dueDate?.slice(0, 10) || '—'}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <div className="roles-table__wrapper dashboard-table-wrap">
          <h3 className="tasks-activity__title">Tasks Overview</h3>
          <table className="roles-table dashboard-table dashboard-table-modern">
          <thead>
            <tr>
              <th>SR No</th>
              <th>Status</th>
              <th>Date</th>
              <th>Candidate</th>
              <th>Company</th>
              <th>Time</th>
              <th>Assign To</th>
            </tr>
          </thead>
          <tbody>
            {loadingTasks ? (
              <tr>
                <td colSpan={7} className="dashboard-empty">Loading tasks...</td>
              </tr>
            ) : tasksData.length === 0 ? (
              <tr>
                <td colSpan={7} className="dashboard-empty">No tasks found</td>
              </tr>
            ) : (
              tasksData.map((task, index) => {
                return (
                  <tr key={task.id}>
                    <td>{index + 1}</td>
                    <td><span className={`status-pill status-pill--${task.status}`}>{task.status}</span></td>
                    <td>{task.dueDate?.slice(0, 10) || '—'}</td>
                    <td>{task.candidate || '—'}</td>
                    <td>{task.client || '—'}</td>
                    <td className="dashboard-time">{task.startTime && task.endTime ? `${formatToAmPm(task.startTime)} - ${formatToAmPm(task.endTime)}` : task.scheduleTime || '—'}</td>
                    <td>{task.assignedToName || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
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
