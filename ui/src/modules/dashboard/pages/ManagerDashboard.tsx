import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import {
  assignManagerTask,
  getManagerDashboardSummary,
  getManagerTasksByStatus,
  getManagerAvailableExperts,
  type DashboardExpert,
  type DashboardSummary,
  type DashboardTask,
  type ManagerTaskStatus,
} from '../api/dashboardApi'

const summaryFallback: DashboardSummary = {
  totalTasks: 0,
  pendingTasks: 0,
  assignedTasks: 0,
  completedTasks: 0,
  cancelledTasks: 0,
  totalClients: 0,
  expertsPresent: 0,
  expertsTotal: 0,
}

const statusLabels: Record<ManagerTaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const ManagerDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary>(summaryFallback)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<ManagerTaskStatus>('pending')
  const [tasksByTab, setTasksByTab] = useState<Record<ManagerTaskStatus, DashboardTask[]>>({
    pending: [],
    assigned: [],
    completed: [],
    cancelled: [],
  })
  const [loadingByTab, setLoadingByTab] = useState<Record<ManagerTaskStatus, boolean>>({
    pending: true,
    assigned: false,
    completed: false,
    cancelled: false,
  })
  const [loadedTabs, setLoadedTabs] = useState<Record<ManagerTaskStatus, boolean>>({
    pending: false,
    assigned: false,
    completed: false,
    cancelled: false,
  })
  const [tableError, setTableError] = useState<string | null>(null)

  const [viewingTask, setViewingTask] = useState<DashboardTask | null>(null)
  const [assigningTask, setAssigningTask] = useState<DashboardTask | null>(null)
  const [experts, setExperts] = useState<DashboardExpert[]>([])
  const [expertsLoading, setExpertsLoading] = useState(false)
  const [expertsError, setExpertsError] = useState<string | null>(null)
  const [selectedExpertId, setSelectedExpertId] = useState<string>('')
  const [assigningLoading, setAssigningLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadSummary = async () => {
      try {
        setSummaryLoading(true)
        setSummaryError(null)
        const response = await getManagerDashboardSummary()
        if (!mounted) return
        setSummary(response)
      } catch (error) {
        console.error('Failed to load dashboard summary', error)
        if (!mounted) return
        setSummaryError(error instanceof Error ? error.message : 'Unable to load summary cards.')
      } finally {
        if (mounted) {
          setSummaryLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      mounted = false
    }
  }, [])

  const loadTabTasks = async (status: ManagerTaskStatus, force = false) => {
    if (loadedTabs[status] && !force) {
      return
    }

    try {
      setLoadingByTab((prev) => ({ ...prev, [status]: true }))
      setTableError(null)
      const response = await getManagerTasksByStatus(status)
      setTasksByTab((prev) => ({ ...prev, [status]: response }))
      setLoadedTabs((prev) => ({ ...prev, [status]: true }))
    } catch (error) {
      console.error(`Failed to load ${status} tasks`, error)
      setTableError(error instanceof Error ? error.message : 'Unable to load tasks for the selected tab.')
    } finally {
      setLoadingByTab((prev) => ({ ...prev, [status]: false }))
    }
  }

  useEffect(() => {
    void loadTabTasks(activeTab)
  }, [activeTab])

  useEffect(() => {
    let mounted = true

    const loadExperts = async () => {
      if (!assigningTask) {
        setExperts([])
        setExpertsError(null)
        setSelectedExpertId('')
        return
      }

      try {
        setExpertsLoading(true)
        setExpertsError(null)
        const response = await getManagerAvailableExperts({
          taskDate: assigningTask.dueDate ?? '',
          startTime: assigningTask.startTime ?? '',
          endTime: assigningTask.endTime ?? '',
        })

        if (!mounted) return

        setExperts(response)
        setSelectedExpertId('')
      } catch (error) {
        console.error('Failed to load available experts', error)
        if (!mounted) return
        setExperts([])
        setExpertsError(error instanceof Error ? error.message : 'Unable to load experts for this slot.')
      } finally {
        if (mounted) {
          setExpertsLoading(false)
        }
      }
    }

    void loadExperts()

    return () => {
      mounted = false
    }
  }, [assigningTask])

  const currentTasks = tasksByTab[activeTab]
  const currentTabLoading = loadingByTab[activeTab]

  const cards = useMemo(
    () => [
      { label: 'Total Tasks', value: summary.totalTasks, action: undefined },
      {
        label: 'Pending Tasks',
        value: summary.pendingTasks,
        action: () => setActiveTab('pending' as const),
      },
      {
        label: 'Assigned Tasks',
        value: summary.assignedTasks,
        action: () => setActiveTab('assigned' as const),
      },
      {
        label: 'Cancelled Tasks',
        value: summary.cancelledTasks ?? 0,
        action: () => setActiveTab('cancelled' as const),
      },
      { label: 'Total Clients', value: summary.totalClients, action: undefined },
      { label: 'Experts', value: summary.expertsTotal, action: undefined },
    ],
    [summary],
  )

  const taskAction = (task: DashboardTask) => {
    if (task.status === 'pending') {
      return { label: 'Assign', disabled: false }
    }

    if (task.status === 'assigned') {
      return { label: 'Reassign', disabled: false }
    }

    return { label: 'Assign', disabled: true }
  }

  const handleAssignSubmit = async () => {
    if (!assigningTask || !selectedExpertId) return

    try {
      setAssigningLoading(true)
      setExpertsError(null)
      await assignManagerTask(assigningTask.id, selectedExpertId)
      setAssigningTask(null)
      setSelectedExpertId('')
      await loadTabTasks(activeTab, true)
      setSummaryLoading(true)
      const refreshedSummary = await getManagerDashboardSummary()
      setSummary(refreshedSummary)
    } catch (error) {
      console.error('Failed to assign task', error)
      setExpertsError(error instanceof Error ? error.message : 'Unable to assign task.')
    } finally {
      setAssigningLoading(false)
      setSummaryLoading(false)
    }
  }

  return (
    <section>
      <h2 className="page-title">Manager Dashboard</h2>
      <p className="page-description">Live dashboard summary and task assignment workflow.</p>

      <div className="cards-grid dashboard-cards">
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="card skeleton-card" aria-hidden="true" />
            ))
          : cards.map((card) => {
              if (!card.action) {
                return (
                  <article className="card" key={card.label}>
                    <p className="dashboard-card__label">{card.label}</p>
                    <h3 className="dashboard-card__value">{card.value}</h3>
                  </article>
                )
              }

              return (
                <button type="button" className="card dashboard-card-button" key={card.label} onClick={card.action}>
                  <p className="dashboard-card__label">{card.label}</p>
                  <h3 className="dashboard-card__value">{card.value}</h3>
                </button>
              )
            })}
      </div>
      {summaryError ? <p className="dashboard-notice">{summaryError}</p> : null}

      <div className="dashboard-tabs" role="tablist" aria-label="Task tabs">
        {(Object.keys(statusLabels) as ManagerTaskStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            className={`dashboard-tab ${activeTab === status ? 'dashboard-tab--active' : ''}`}
            aria-selected={activeTab === status}
            onClick={() => setActiveTab(status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {tableError ? <p className="dashboard-notice">{tableError}</p> : null}

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
            {currentTabLoading ? (
              <tr>
                <td colSpan={9} className="dashboard-empty">
                  Loading tasks...
                </td>
              </tr>
            ) : currentTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="dashboard-empty">
                  No tasks found
                </td>
              </tr>
            ) : (
              currentTasks.map((task, index) => {
                const action = taskAction(task)
                return (
                  <tr key={task.id}>
                    <td>{index + 1}</td>
                    <td>{task.title}</td>
                    <td>{task.candidate || '—'}</td>
                    <td>{task.client || '—'}</td>
                    <td>{task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : task.scheduleTime || '—'}</td>
                    <td>
                      <span className={`status-pill ${task.status === 'completed' ? 'status-pill--active' : task.status === 'cancelled' ? 'status-pill--inactive' : ''}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.assignedToName || '—'}</td>
                    <td>
                      <button type="button" className="button users-icon-btn" onClick={() => setViewingTask(task)}>
                        View
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button users-icon-btn"
                        disabled={action.disabled}
                        onClick={() => setAssigningTask(task)}
                      >
                        {action.label}
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
        isOpen={Boolean(assigningTask)}
        onClose={() => {
          setAssigningTask(null)
          setSelectedExpertId('')
        }}
        title={assigningTask?.status === 'assigned' ? 'Reassign Task' : 'Assign Task'}
      >
        <h3 className="modal-title">{assigningTask?.status === 'assigned' ? 'Reassign Task' : 'Assign Task'}</h3>
        {expertsLoading ? (
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
                {experts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="dashboard-empty">No experts found</td>
                  </tr>
                ) : (
                  experts.map((expert) => {
                    const isAvailable = expert.isAvailable
                    return (
                      <tr key={expert.id}>
                        <td>{expert.name}</td>
                        <td>
                          <span className={`status-pill ${isAvailable ? 'status-pill--active' : 'status-pill--inactive'}`}>
                            {isAvailable ? 'Available' : 'Not Available'}
                          </span>
                        </td>
                        <td>
                          {isAvailable ? (
                            <button type="button" className="button" onClick={() => setSelectedExpertId(expert.id)}>
                              {selectedExpertId === expert.id ? 'Selected' : 'Select'}
                            </button>
                          ) : (
                            <span className="card-text">Not Available</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {expertsError ? <p className="auth-card__error">{expertsError}</p> : null}

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
            disabled={assigningLoading || expertsLoading || !selectedExpertId}
            onClick={() => void handleAssignSubmit()}
          >
            {assigningLoading ? 'Submitting...' : assigningTask?.status === 'assigned' ? 'Reassign' : 'Assign'}
          </button>
        </div>
      </AnimatedModal>

      <AnimatedModal isOpen={Boolean(viewingTask)} onClose={() => setViewingTask(null)} title="Task details">
        <h3 className="modal-title">Task details</h3>
        <p className="page-description"><strong>Title:</strong> {viewingTask?.title || '—'}</p>
        <p className="page-description"><strong>Candidate:</strong> {viewingTask?.candidate || '—'}</p>
        <p className="page-description"><strong>Company:</strong> {viewingTask?.client || '—'}</p>
        <p className="page-description"><strong>Status:</strong> {viewingTask?.status || '—'}</p>
        <p className="page-description"><strong>Description:</strong></p>
        <div className="card" dangerouslySetInnerHTML={{ __html: viewingTask?.description || '—' }} />
      </AnimatedModal>
    </section>
  )
}

export default ManagerDashboard
