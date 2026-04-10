import { useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
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

const ManagerDashboard = () => {
  const [summaryData, setSummaryData] = useState<DashboardSummary>(defaultSummary)
  const [tasksData, setTasksData] = useState<DashboardTask[]>([])
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
      console.log('Summary API:', response)
      setSummaryData(response)
    } catch (error) {
      console.error('Failed to load dashboard summary', error)
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
      console.log('Tasks API:', response)
      setTasksData(response)
    } catch (error) {
      console.error(`Failed to load tasks for ${status}`, error)
      setTasksError(error instanceof Error ? error.message : 'Unable to load tasks for this tab.')
      setTasksData([])
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  useEffect(() => {
    void loadTasksByStatus(activeTab)
  }, [activeTab])

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
        console.log('Assign modal experts API response:', response)

        if (!mounted) return

        setAvailableExperts(Array.isArray(response) ? response : [])
        setSelectedExpertId('')
      } catch (error) {
        console.error('Failed to load experts for assign modal', error)
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
      await assignManagerTask(assigningTask.id, selectedExpertId)
      setAssigningTask(null)
      setSelectedExpertId('')
      await loadTasksByStatus(activeTab)
      await loadSummary()
    } catch (error) {
      console.error('Failed to assign task', error)
      setAssignError(error instanceof Error ? error.message : 'Unable to assign task.')
    } finally {
      setSubmittingAssign(false)
    }
  }

  console.log('Experts State:', availableExperts)

  return (
    <section>
      <h2 className="page-title">Manager Dashboard</h2>
      <p className="page-description">Live dashboard summary and task assignment workflow.</p>

      <div className="cards-grid dashboard-cards">
        {loadingSummary
          ? Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="card skeleton-card" aria-hidden="true" />
            ))
          : cards.map((card) => {
              if (!card.tab) {
                return (
                  <article className="card" key={card.label}>
                    <p className="dashboard-card__label">{card.label}</p>
                    <h3 className="dashboard-card__value">{card.value}</h3>
                  </article>
                )
              }

              return (
                <button
                  key={card.label}
                  type="button"
                  className="card dashboard-card-button"
                  onClick={() => setActiveTab(card.tab)}
                >
                  <p className="dashboard-card__label">{card.label}</p>
                  <h3 className="dashboard-card__value">{card.value}</h3>
                </button>
              )
            })}
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
                    <td>{task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : task.scheduleTime || '—'}</td>
                    <td><span className="status-pill">{task.status}</span></td>
                    <td>{task.assignedToName || '—'}</td>
                    <td>
                      <button type="button" className="button users-icon-btn" onClick={() => setDetailTask(task)}>
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
                          className="button"
                          disabled={expert.status !== 'available'}
                          onClick={() => setSelectedExpertId(expert.id)}
                        >
                          {expert.status === 'available'
                            ? selectedExpertId === expert.id
                              ? '✔ Selected'
                              : '✔ Select'
                            : '✕ Busy'}
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

      <AnimatedModal isOpen={Boolean(detailTask)} onClose={() => setDetailTask(null)} title="Task details">
        <h3 className="modal-title">Task details</h3>
        <p className="page-description"><strong>Title:</strong> {detailTask?.title || '—'}</p>
        <p className="page-description"><strong>Candidate:</strong> {detailTask?.candidate || '—'}</p>
        <p className="page-description"><strong>Company:</strong> {detailTask?.client || '—'}</p>
        <p className="page-description"><strong>Status:</strong> {detailTask?.status || '—'}</p>
        <p className="page-description"><strong>Description:</strong></p>
        <div className="card" dangerouslySetInnerHTML={{ __html: detailTask?.description || '—' }} />
      </AnimatedModal>
    </section>
  )
}

export default ManagerDashboard
