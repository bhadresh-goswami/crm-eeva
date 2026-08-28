import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import { useAlert } from '../../../shared/alerts/useAlert'
import PageContainer from '../../../shared/components/PageContainer'
import ManagerWorkspaceHeader from '../../../shared/components/ManagerWorkspaceHeader'
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
import { FaChartLine, FaCheckCircle, FaClock, FaDownload, FaEye, FaFile, FaPlus, FaRedo, FaRupeeSign, FaSearch, FaUserPlus } from 'react-icons/fa'
import KPIStatCard from '../../../components/dashboard/KPIStatCard'
import StatusBadge from '../../../components/dashboard/StatusBadge'
import PendingFeedbackOverview from '../../tasks/components/PendingFeedbackOverview'

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
  in_progress: 'In Progress',
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
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false)
  const [lastKnownTaskUpdate, setLastKnownTaskUpdate] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [expertFilter, setExpertFilter] = useState('')
  const [dueFilter, setDueFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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
      const statuses: ManagerTaskStatus[] = ['assigned', 'pending', 'in_progress', 'completed', 'cancelled']
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
      { label: 'Total Revenue', value: `₹${liveTasks.reduce((sum, task) => sum + Number(task.amount ?? 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, tone: 'success' },
      { label: 'Completed Tasks', value: summaryData.completedTasks, tab: 'completed' as const, tone: 'success' },
      { label: 'Pending Tasks', value: summaryData.pendingTasks, tab: 'pending' as const, tone: 'warning' },
      { label: 'Success Rate', value: `${kpi.productivity}%`, tone: 'default' },
    ],
    [kpi.productivity, liveTasks, summaryData.completedTasks, summaryData.pendingTasks],
  )

  const tabCounts = useMemo<Record<ManagerTaskStatus, number>>(() => ({
    pending: summaryData.pendingTasks,
    assigned: summaryData.assignedTasks,
    in_progress: liveTasks.filter((task) => task.status.replace(' ', '_') === 'in_progress').length,
    completed: summaryData.completedTasks,
    cancelled: summaryData.cancelledTasks ?? 0,
  }), [liveTasks, summaryData])

  const companies = useMemo(() => [...new Set(tasksData.map((task) => task.client).filter((value) => value && value !== '—'))].sort(), [tasksData])
  const experts = useMemo(() => [...new Set(tasksData.map((task) => task.assignedToName).filter((value): value is string => Boolean(value)))].sort(), [tasksData])
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    const today = new Date().toISOString().slice(0, 10)
    return tasksData.filter((task) => {
      const matchesSearch = !query || [task.id, task.candidate, task.client, task.assignedToName].some((value) => String(value ?? '').toLowerCase().includes(query))
      const date = task.dueDate?.slice(0, 10) ?? ''
      const matchesDue = !dueFilter || (dueFilter === 'today' ? date === today : dueFilter === 'overdue' ? isOverdueTask(task) : true)
      return matchesSearch && (!companyFilter || task.client === companyFilter) && (!expertFilter || task.assignedToName === expertFilter) && matchesDue
    })
  }, [companyFilter, dueFilter, expertFilter, search, tasksData])
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const visibleTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [activeTab, companyFilter, dueFilter, expertFilter, search, pageSize])

  const statusMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
    const dueToday = tasksData.filter((task) => task.dueDate?.slice(0, 10) === today).length
    const overdue = tasksData.filter(isOverdueTask).length
    const dueWeek = tasksData.filter((task) => task.dueDate && new Date(task.dueDate) >= new Date(today) && new Date(task.dueDate) <= weekEnd).length
    const labels: Record<ManagerTaskStatus, [string, string][]> = {
      pending: [['Total Pending', String(tasksData.length)], ['Unassigned', String(tasksData.filter(t => !t.assignedToName).length)], ['Due Today', String(dueToday)], ['Overdue', String(overdue)]],
      assigned: [['Total Assigned Tasks', String(tasksData.length)], ['Due Today', String(dueToday)], ['Due This Week', String(dueWeek)], ['Overdue', String(overdue)]],
      in_progress: [['Currently Running', String(tasksData.length)], ['Ending Today', String(dueToday)], ['Ending This Week', String(dueWeek)], ['Overdue', String(overdue)]],
      completed: [['Completed', String(tasksData.length)], ['Completed Today', String(dueToday)], ['Success Rate', `${kpi.productivity}%`], ['Feedback Pending', '—']],
      cancelled: [['Cancelled', String(tasksData.length)], ['Cancelled Today', String(dueToday)], ['Cancellation Rate', summaryData.totalTasks ? `${Math.round((tasksData.length / summaryData.totalTasks) * 100)}%` : '0%'], ['Most Common Reason', '—']],
    }
    return labels[activeTab]
  }, [activeTab, kpi.productivity, summaryData.totalTasks, tasksData])

  const dashboardAlerts = useMemo(() => {
    const normalizedStatus = (task: DashboardTask) => task.status.replace(/_/g, ' ').trim().toLowerCase()
    const isPendingAssignment = (task: DashboardTask) => normalizedStatus(task) === 'pending'
    const isUpcoming = (task: DashboardTask) => {
      if (!task.dueDate) return true
      const taskDate = task.dueDate.slice(0, 10)
      const taskDateTime = task.startTime ? new Date(`${taskDate}T${task.startTime.slice(0, 5)}:00`) : new Date(taskDate)
      if (Number.isNaN(taskDateTime.getTime())) return true
      return taskDateTime >= new Date()
    }
    const isScheduled = (task: DashboardTask) => normalizedStatus(task) === 'assigned' && isUpcoming(task)
    const isInProgress = (task: DashboardTask) => normalizedStatus(task) === 'in progress'
    const counts = {
      pendingAssignment: liveTasks.filter(isPendingAssignment).length,
      scheduled: liveTasks.filter(isScheduled).length,
      inProgress: liveTasks.filter(isInProgress).length,
    }

    const rows = liveTasks
      .filter((task) => isPendingAssignment(task) || isScheduled(task) || isInProgress(task))
      .map((task) => {
        const alertType = isPendingAssignment(task)
          ? 'Pending Assignment'
          : isScheduled(task)
            ? 'Scheduled'
            : 'In Progress'
        const alertMessage = isPendingAssignment(task)
          ? 'Task created but not assigned.'
          : isScheduled(task)
            ? 'Task scheduled and awaiting execution.'
            : 'Task currently in progress.'

        return { task, alertType, alertMessage }
      })

    return { counts, rows }
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
    <PageContainer>
      <ManagerWorkspaceHeader
        title="Manage assignments and task execution."
        subtitle="Track task progress, monitor schedules, and ensure timely delivery across all coordinators and experts."
        notificationCount={dashboardAlerts.rows.length}
        onNotificationsClick={() => setIsAlertsModalOpen(true)}
        actions={(
          <>
            <button className="manager-action" type="button" onClick={() => (window.location.href = '/tasks')}><FaPlus /> Create Task</button>
            <button className="manager-action" type="button" onClick={() => setActiveTab('pending')}><FaUserPlus /> Bulk Assign</button>
            <button className="manager-action" type="button" onClick={() => setActiveTab('assigned')}><FaRedo /> Reassign Tasks</button>
            <button className="manager-action" type="button" onClick={() => window.print()}><FaDownload /> Export Data</button>
          </>
        )}
      />

      <div className="manager-kpi-grid section">
        {loadingSummary
          ? Array.from({ length: cards.length || 5 }).map((_, index) => (
              <article key={index} className="kpi-card skeleton-card" aria-hidden="true" />
            ))
          : cards.map((card) => {
              const icon = card.label === 'Total Revenue' ? <FaRupeeSign />
                : card.label === 'Completed Tasks' ? <FaCheckCircle />
                  : card.label === 'Pending Tasks' ? <FaClock /> : <FaChartLine />
              const helperText = card.label === 'Success Rate' ? 'Completion trend for active pipeline' : 'Updated from live task data'
              return <KPIStatCard key={card.label} title={card.label} value={card.value} icon={icon} helperText={helperText} accent={card.tone === 'default' ? 'primary' : card.tone as 'success' | 'warning' | 'danger'} onClick={card.tab ? () => setActiveTab(card.tab) : undefined} />
            })}
      </div>
      {summaryError ? <p className="dashboard-notice">{summaryError}</p> : null}

      <PendingFeedbackOverview
        title="Pending Feedback Overview"
        subtitle="Tasks awaiting expert feedback submission."
        emptyTitle="🎉 All feedback submissions are up to date."
        emptyMessage="No pending feedback found."
        dashboardVariant
        onExpertClick={(expertName) => { window.location.href = `/reports/feedback-pending?expert=${encodeURIComponent(expertName)}` }}
      />

      <section className="task-operations section">
      <div className="task-operations__tabs" role="tablist" aria-label="Task tabs">
        {(Object.keys(tabLabels) as ManagerTaskStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            className={`task-status-tab ${activeTab === status ? 'is-active' : ''}`}
            aria-selected={activeTab === status}
            onClick={() => setActiveTab(status)}
          >
            {tabLabels[status]} <span>{tabCounts[status]}</span>
          </button>
        ))}
        <button className="task-refresh" type="button" onClick={() => void Promise.all([loadTasksByStatus(activeTab), loadSummary()])}><FaRedo /> Refresh</button>
      </div>

      {tasksError ? <p className="dashboard-notice">{tasksError}</p> : null}

      <div className="task-metrics">
        {statusMetrics.map(([label, value]) => <div className="task-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="task-toolbar">
        <label className="task-search"><FaSearch /><input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by candidate, company or task ID..." /></label>
        <select aria-label="All Companies" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="">All Companies</option>{companies.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="All Experts" value={expertFilter} onChange={(event) => setExpertFilter(event.target.value)}><option value="">All Experts</option>{experts.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Due Date" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}><option value="">Due Date</option><option value="today">Due Today</option><option value="overdue">Overdue</option></select>
        {(search || companyFilter || expertFilter || dueFilter) && <button className="task-reset" type="button" onClick={() => { setSearch(''); setCompanyFilter(''); setExpertFilter(''); setDueFilter('') }}>Reset</button>}
      </div>
      <div className="task-table-scroll">
          <table className="manager-task-table">
          <thead>
            <tr>
              <th>Actions</th>
              <th>SR No</th>
              <th>Task ID</th>
              <th>Candidate</th>
              <th>Company</th>
              <th>Assign To</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Time</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {loadingTasks ? (
              <tr>
                <td colSpan={10} className="dashboard-empty">Loading tasks...</td>
              </tr>
            ) : visibleTasks.length === 0 ? (
              <tr>
                <td colSpan={10}><div className="task-empty"><FaClock /><strong>No {tabLabels[activeTab].toLowerCase()} tasks found</strong><span>There are currently no tasks matching this status and your filters.</span>{activeTab === 'pending' && <NavLink className="button" to="/tasks">Create Task</NavLink>}</div></td>
              </tr>
            ) : (
              visibleTasks.map((task, index) => {
                return (
                  <tr key={task.id}>
                    <td><div className="task-actions"><button type="button" title="View Task" onClick={() => setDetailTask(task)}><FaEye /></button>{['pending', 'assigned'].includes(activeTab) && <button type="button" title="Assign Expert" onClick={() => setAssigningTask(task)}><FaUserPlus /></button>}</div></td>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td><strong>#{task.id}</strong></td>
                    <td>{task.candidate || '—'}</td>
                    <td>{task.client || '—'}</td>
                    <td>{task.assignedToName || 'Unassigned'}</td>
                    <td>{task.dueDate?.slice(0, 10) || '—'}</td>
                    <td><StatusBadge status={task.status} /></td>
                    <td className="dashboard-time">{task.startTime && task.endTime ? `${formatToAmPm(task.startTime)} – ${formatToAmPm(task.endTime)}` : '—'}</td>
                    <td>{task.fileUrl ? <a className="task-file" href={task.fileUrl} target="_blank" rel="noreferrer" title="Open file"><FaFile /></a> : '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          </table>
      </div>
      <div className="task-pagination"><span>Showing {filteredTasks.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks</span><div><label>Rows per page: <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option>5</option><option>10</option><option>20</option></select></label><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>‹</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage(value => value + 1)}>›</button></div></div>
      </section>

      <div className="manager-report-grid section">
        <div className="card">
          <h3 className="tasks-activity__title">Team Workload Report</h3>
          <p className="card-text">View coordinator workload distribution and performance.</p>
          <NavLink className="button" to="/manager/reports/team-workload">View Report</NavLink>
        </div>
        <div className="card">
          <h3 className="tasks-activity__title">Pending Payments</h3>
          <p className="card-text">Track unpaid invoices and pending collections.</p>
          <p className="card-text">Total Pending Payments Count: {summaryData.pendingPaymentUpdates ?? 0}</p>
          <p className="card-text">Total Pending Amount: ₹{(summaryData.pendingPaymentAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <NavLink className="button" to="/manager/reports/pending-payments">View Report</NavLink>
        </div>
      </div>


      <AnimatedModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        title="Dashboard Alerts"
      >
        <h3 className="modal-title">Dashboard Alerts</h3>
        <div className="dashboard-action-group section">
          <span className="crm-status-badge crm-status-badge--pending">Pending Assignment : {dashboardAlerts.counts.pendingAssignment}</span>
          <span className="crm-status-badge crm-status-badge--pending">Scheduled : {dashboardAlerts.counts.scheduled}</span>
          <span className="crm-status-badge crm-status-badge--pending">In Progress : {dashboardAlerts.counts.inProgress}</span>
        </div>
        <div className="roles-table__wrapper" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <table className="roles-table dashboard-table dashboard-table-modern">
            <thead>
              <tr>
                <th>Alert Type</th>
                <th>Candidate Name</th>
                <th>Company</th>
                <th>Task Type</th>
                <th>Task Status</th>
                <th>Assigned To</th>
                <th>Task Date</th>
                <th>Start Time</th>
                <th>Alert Message</th>
              </tr>
            </thead>
            <tbody>
              {dashboardAlerts.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dashboard-empty">No dashboard alerts found</td>
                </tr>
              ) : dashboardAlerts.rows.map(({ task, alertType, alertMessage }) => (
                <tr key={`${alertType}-${task.id}`}>
                  <td>{alertType}</td>
                  <td>{task.candidate || '—'}</td>
                  <td>{task.client || '—'}</td>
                  <td>{task.supportType || task.title || '—'}</td>
                  <td><StatusBadge status={task.status} /></td>
                  <td>{task.assignedToName || 'Unassigned'}</td>
                  <td>{task.dueDate?.slice(0, 10) || '—'}</td>
                  <td>{formatToAmPm(task.startTime)}</td>
                  <td>{alertMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimatedModal>

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
