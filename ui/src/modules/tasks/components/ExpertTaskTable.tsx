import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BsDownload } from 'react-icons/bs'
import { apiFetch } from '../../../api/client'
import { checkExpertActiveTask, endExpertTask, startExpertTask, type EndTaskStatus, type ExpertTaskItem } from '../api/expertTasksApi'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import { useAlert } from '../../../shared/alerts/useAlert'

type ExpertTaskTableProps = {
  tasks: ExpertTaskItem[]
  loading: boolean
  error: string | null
  emptyText: string
  currentUserId: number
  onTaskUpdated: () => Promise<void>
  dateRangeFilter: '7' | '10' | 'all'
  onDateRangeFilterChange: (value: '7' | '10' | 'all') => void
  dashboardMode?: boolean
}

const defaultPageSizes = [5, 10, 20]
const dashboardPageSizes = [10, 20, 50, 100, 200, 300, 500]

const statusLabel = (statusName: string) => {
  const value = statusName.trim().toLowerCase()
  if (value.includes('pending')) return 'Pending'
  if (value.includes('assign')) return 'Assigned'
  if (value.includes('progress')) return 'In Progress'
  if (value.includes('complete')) return 'Completed'
  if (value.includes('cancel')) return 'Cancelled'
  if (value.includes('show')) return 'No Show'
  if (value.includes('reschedule')) return 'Rescheduled'
  return 'Unknown'
}

const badgeStyle = (label: string): CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    Pending: { bg: '#e5e7eb', color: '#374151' },
    Assigned: { bg: '#dbeafe', color: '#1d4ed8' },
    'In Progress': { bg: '#dcfce7', color: '#166534' },
    Completed: { bg: '#dcfce7', color: '#166534' },
    Cancelled: { bg: '#fed7aa', color: '#9a3412' },
    'No Show': { bg: '#fef3c7', color: '#92400e' },
    Rescheduled: { bg: '#4b5563', color: '#f9fafb' },
    Unknown: { bg: '#f3f4f6', color: '#4b5563' },
  }
  const style = map[label] ?? map.Unknown
  return { background: style.bg, color: style.color, borderRadius: 999, padding: '0.22rem 0.7rem', fontWeight: 600, fontSize: 12 }
}

const rowStyleByStatus = (status: string): CSSProperties => {
  if (status === 'In Progress') return { background: '#f0fdf4', color: '#14532d' }
  if (status === 'Cancelled') return { background: '#fff7ed', color: '#9a3412' }
  if (status === 'No Show') return { background: '#fffbeb', color: '#854d0e' }
  if (status === 'Rescheduled') return { background: '#4b5563', color: '#f9fafb' }
  return { background: '#ffffff', color: '#111827' }
}

const toUtcFromIst = (dateValue: string, timeValue: string) => {
  const [y, m, d] = dateValue.split('-').map(Number)
  const [hh, mm, ss = 0] = timeValue.split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, ss) - 330 * 60 * 1000
  return new Date(utcMs)
}

const formatDate = (dateValue: string) => {
  const start = toUtcFromIst(dateValue, '00:00:00')
  if (!start) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(start)
}

const formatTimeZone = (dateValue: string, startTime: string, endTime: string, timeZone: 'Asia/Kolkata' | 'America/New_York') => {
  const start = toUtcFromIst(dateValue, startTime)
  const end = toUtcFromIst(dateValue, endTime)
  if (!start || !end) return '—'
  const formatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone })
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

const formatDateAndTimeZone = (dateValue: string, startTime: string, endTime: string, timeZone: 'Asia/Kolkata' | 'America/New_York') => {
  const dateText = formatDate(dateValue)
  const timeText = formatTimeZone(dateValue, startTime, endTime, timeZone)
  if (dateText === '—' || timeText === '—') return '—'
  return `${dateText} | ${timeText}`
}

const getResumeUrl = (task: ExpertTaskItem & { displayStatus: string }) => {
  const value = String(task.resume_url || task.candidate_resume || '').trim()
  return value || ''
}

const toIstDate = (dateValue: string) => {
  const [y, m, d] = dateValue.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}


const ExpertTaskTable = ({ tasks, loading, error, emptyText, currentUserId, onTaskUpdated, dateRangeFilter, onDateRangeFilterChange, dashboardMode = false }: ExpertTaskTableProps) => {
  const { showToast } = useAlert()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'my' | 'sub'>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [viewTaskId, setViewTaskId] = useState<number | null>(null)
  const [startTaskId, setStartTaskId] = useState<number | null>(null)
  const [endTaskId, setEndTaskId] = useState<number | null>(null)
  const [endStatus, setEndStatus] = useState<EndTaskStatus | ''>('')
  const [endComment, setEndComment] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [hasActiveTask, setHasActiveTask] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768)
  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0)
  const pageSizes = dashboardMode ? dashboardPageSizes : defaultPageSizes

  const mapped = useMemo(() => tasks.map((task) => ({ ...task, displayStatus: statusLabel(task.status_name) })), [tasks])

  const refreshActiveTaskState = async () => {
    try {
      const activeState = await checkExpertActiveTask()
      setHasActiveTask(activeState.hasActiveTask)
      setActiveTaskId(activeState.activeTaskId)
    } catch {
      setHasActiveTask(false)
      setActiveTaskId(null)
    }
  }

  useEffect(() => {
    void refreshActiveTaskState()
  }, [tasks])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const filtered = useMemo(() => {
    return mapped.filter((task) => {
      const searchable = `${task.title} ${task.candidate_name} ${task.company_name} ${task.assigned_to_name} ${task.assigned_by_name}`.toLowerCase()
      const matchesSearch = searchable.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || task.displayStatus === statusFilter
      const isMine = task.is_own_task === 1 || (currentUserId > 0 && task.assigned_to_id === currentUserId)
      const matchesAssignment = assignmentFilter === 'all' || (assignmentFilter === 'my' ? isMine : !isMine)
      const taskDate = toIstDate(task.due_date)
      const nowUtc = new Date()
      const today = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()))
      const matchesDateRange = (() => {
        if (dateRangeFilter === 'all') return true
        if (!taskDate) return false
        const days = Number(dateRangeFilter)
        const start = new Date(today)
        start.setUTCDate(today.getUTCDate() - days)
        return taskDate >= start && taskDate <= today
      })()
      return matchesSearch && matchesStatus && matchesAssignment && matchesDateRange
    })
  }, [assignmentFilter, currentUserId, mapped, search, statusFilter, dateRangeFilter])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const dateCmp = String(b.due_date || '').localeCompare(String(a.due_date || ''))
    if (dateCmp !== 0) return dateCmp
    return b.task_id - a.task_id
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const selectedTask = mapped.find((task) => task.task_id === viewTaskId) ?? null
  const statusOptions = Array.from(new Set(mapped.map((item) => item.displayStatus)))
  const cellClampStyle: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontSize: 13, lineHeight: 1.35 }

  const downloadFile = async (fileRef: string) => {
    if (!fileRef) return
    const normalized = fileRef.trim()
    const fileName = normalized.split('/').pop() ?? ''
    if (!fileName) return
    const response = await apiFetch(`/tasks/file?file=${encodeURIComponent(fileName)}`)
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const canStartTask = (task: (ExpertTaskItem & { displayStatus: string })) => {
    const isMine = task.is_own_task === 1 || task.assigned_to_id === currentUserId
    const startableStatus = task.displayStatus === 'Pending' || task.displayStatus === 'Assigned'
    return isMine && startableStatus && (!hasActiveTask || activeTaskId === task.task_id)
  }

  const canEndTask = (task: (ExpertTaskItem & { displayStatus: string })) => {
    const isMine = task.is_own_task === 1 || task.assigned_to_id === currentUserId
    return isMine && task.displayStatus === 'In Progress'
  }

  const handleStartTask = async () => {
    if (!startTaskId) return
    try {
      setActionLoading(true)
      setActionError(null)
      await startExpertTask(startTaskId)
      setStartTaskId(null)
      showToast({ type: 'success', message: 'Task started successfully.' })
      await onTaskUpdated()
      await refreshActiveTaskState()
    } catch (startError) {
      setActionError('Unable to start task. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const openEndTaskModal = (taskId: number) => {
    setEndTaskId(taskId)
    setEndStatus('')
    setEndComment('')
    setActionError(null)
  }

  const submitEndTask = async () => {
    if (!endTaskId) return
    if (!endStatus || !endComment.trim()) {
      setActionError('Status and comment are required.')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      await endExpertTask(endTaskId, endStatus, endComment.trim())
      setCommentsRefreshKey((current) => current + 1)
      setEndTaskId(null)
      setViewTaskId(null)
      showToast({ type: 'success', message: 'Task updated successfully.' })
      await onTaskUpdated()
      await refreshActiveTaskState()
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Unable to end task.')
    } finally {
      setActionLoading(false)
    }
  }

  const renderActions = (task: ExpertTaskItem & { displayStatus: string }, startDisabled: boolean, disableStartTooltip: string) => (
    <div className="d-flex align-items-center gap-2" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <button className="button" title="View task details" onClick={() => setViewTaskId(task.task_id)} style={{ width: 32, height: 32, minWidth: 32, padding: 0, cursor: 'pointer' }}>👁</button>
      {getResumeUrl(task) ? <button className="btn btn-outline-secondary btn-sm" title="Download Resume" onClick={() => window.open(getResumeUrl(task), '_blank', 'noopener,noreferrer')} style={{ width: 32, height: 32, padding: 0 }}><BsDownload size={14} /></button> : null}
      {task.file_url ? <button className="button" title="Download file" onClick={() => void downloadFile(task.file_url)} style={{ width: 32, height: 32, minWidth: 32, padding: 0 }}>⬇</button> : null}
      {(task.displayStatus === 'Pending' || task.displayStatus === 'Assigned') ? <button className="button button--primary" title={disableStartTooltip} disabled={startDisabled} onClick={() => setStartTaskId(task.task_id)} style={{ height: 32, padding: '0 10px' }}>▶ Start</button> : null}
      {canEndTask(task) ? <button className="button button--primary" title="End task" onClick={() => openEndTaskModal(task.task_id)} style={{ height: 32, padding: '0 10px' }}>✅ End</button> : null}
    </div>
  )

  const renderActions = (task: ExpertTaskItem & { displayStatus: string }, startDisabled: boolean, disableStartTooltip: string) => (
    <div className="d-flex align-items-center gap-2" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <button className="button" title="View task details" onClick={() => setViewTaskId(task.task_id)} style={{ width: 32, height: 32, minWidth: 32, padding: 0, cursor: 'pointer' }}>👁</button>
      {getResumeUrl(task) ? <button className="btn btn-outline-secondary btn-sm" title="Download Resume" onClick={() => window.open(getResumeUrl(task), '_blank', 'noopener,noreferrer')} style={{ width: 32, height: 32, padding: 0 }}><BsDownload size={14} /></button> : null}
      {task.file_url ? <button className="button" title="Download file" onClick={() => void downloadFile(task.file_url)} style={{ width: 32, height: 32, minWidth: 32, padding: 0 }}>⬇</button> : null}
      {(task.displayStatus === 'Pending' || task.displayStatus === 'Assigned') ? <button className="button button--primary" title={disableStartTooltip} disabled={startDisabled} onClick={() => setStartTaskId(task.task_id)} style={{ height: 32, padding: '0 10px' }}>▶ Start</button> : null}
      {canEndTask(task) ? <button className="button button--primary" title="End task" onClick={() => openEndTaskModal(task.task_id)} style={{ height: 32, padding: '0 10px' }}>✅ End</button> : null}
    </div>
  )

  const renderActions = (task: ExpertTaskItem & { displayStatus: string }, startDisabled: boolean, disableStartTooltip: string) => (
    <div className="d-flex align-items-center gap-2" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <button className="button" title="View task details" onClick={() => setViewTaskId(task.task_id)} style={{ width: 32, height: 32, minWidth: 32, padding: 0, cursor: 'pointer' }}>👁</button>
      {getResumeUrl(task) ? <button className="btn btn-outline-secondary btn-sm" title="Download Resume" onClick={() => window.open(getResumeUrl(task), '_blank', 'noopener,noreferrer')} style={{ width: 32, height: 32, padding: 0 }}><BsDownload size={14} /></button> : null}
      {task.file_url ? <button className="button" title="Download file" onClick={() => void downloadFile(task.file_url)} style={{ width: 32, height: 32, minWidth: 32, padding: 0 }}>⬇</button> : null}
      {(task.displayStatus === 'Pending' || task.displayStatus === 'Assigned') ? <button className="button button--primary" title={disableStartTooltip} disabled={startDisabled} onClick={() => setStartTaskId(task.task_id)} style={{ height: 32, padding: '0 10px' }}>▶ Start</button> : null}
      {canEndTask(task) ? <button className="button button--primary" title="End task" onClick={() => openEndTaskModal(task.task_id)} style={{ height: 32, padding: '0 10px' }}>✅ End</button> : null}
    </div>
  )

  return (
    <div className={`card${dashboardMode ? ' expert-dashboard__task-table' : ''}`} style={{ borderRadius: 12, overflow: 'hidden', padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search by title, candidate, assignee..." style={{ border: '1px solid #d1d5db', borderRadius: 8, minWidth: 290, padding: '0.45rem 0.6rem', outline: 'none', background: '#fff', fontSize: 13 }} />
        <div className={dashboardMode ? 'expert-dashboard__task-filters' : undefined} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '0.45rem 0.6rem', fontSize: 13 }}>
            <option value="all">All Status</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={assignmentFilter} onChange={(event) => { setAssignmentFilter(event.target.value as 'all' | 'my' | 'sub'); setPage(1) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '0.45rem 0.6rem', fontSize: 13 }}>
            <option value="all">All Tasks</option>
            <option value="my">My Tasks</option>
            <option value="sub">Team Tasks</option>
          </select>
          <select value={dateRangeFilter} onChange={(event) => { onDateRangeFilterChange(event.target.value as '7' | '10' | 'all'); setPage(1) }} style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '0.45rem 0.6rem', fontSize: 13 }}>
            <option value="7">Last 7 Days</option>
            <option value="10">Last 10 Days</option>
            <option value="all">All Tasks</option>
          </select>
          {dashboardMode ? <span className="expert-dashboard__refresh"><i /> Auto refresh every 30s</span> : null}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: 'grid', gap: '0.75rem', padding: '0 1rem 1rem' }}>
          {paged.map((task) => {
            const rowStyle = rowStyleByStatus(task.displayStatus)
            const startDisabled = !canStartTask(task)
            return (
              <div key={task.task_id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.8rem', ...rowStyle }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <strong style={{ fontSize: 14 }}>{task.title || 'Untitled Task'}</strong>
                  <span style={badgeStyle(task.displayStatus)}>{task.displayStatus}</span>
                </div>
                <p style={{ margin: '0.45rem 0', fontSize: 13 }}>{task.candidate_name || '—'}</p>
                <p style={{ margin: '0.3rem 0', fontSize: 13 }}>{formatDateAndTimeZone(task.due_date, task.start_time, task.end_time, 'Asia/Kolkata')}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="button" title="View" onClick={() => setViewTaskId(task.task_id)} style={{ minWidth: 36 }}>👁</button>
                  {getResumeUrl(task) ? (
                    <button
                      className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                      title="Download Resume"
                      onClick={() => window.open(getResumeUrl(task), '_blank', 'noopener,noreferrer')}
                      style={{ minWidth: 36, height: 32, padding: '0 10px' }}
                    >
                      <BsDownload size={14} />
                    </button>
                  ) : null}
                  {(task.displayStatus === 'Pending' || task.displayStatus === 'Assigned') ? (
                    <button className="button button--primary" title={startDisabled ? 'Another task is already in progress' : 'Start task'} disabled={startDisabled} onClick={() => setStartTaskId(task.task_id)} style={{ whiteSpace: 'nowrap' }}>▶ Start</button>
                  ) : null}
                  {canEndTask(task) ? (
                    <button className="button button--primary" title="End task" onClick={() => openEndTaskModal(task.task_id)} style={{ whiteSpace: 'nowrap' }}>✅ End</button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={dashboardMode ? 'expert-dashboard__table-scroll expert-dashboard__task-scroll' : undefined} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 460 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {dashboardMode ? <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Actions</th> : null}
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Date (IST)</th>
                <th style={{ textAlign: 'center', padding: '0.65rem 0.75rem', fontSize: 13 }}>Time (IST)</th>
                <th style={{ textAlign: 'center', padding: '0.65rem 0.75rem', fontSize: 13 }}>Time (ET)</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Candidate Name</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Title</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Assigned To</th>
                <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Assigned By</th>
                {!dashboardMode ? <th style={{ textAlign: 'right', padding: '0.65rem 0.75rem', fontSize: 13 }}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} style={{ padding: '1rem' }}>Loading tasks...</td></tr> : null}
              {!loading && error ? <tr><td colSpan={9} style={{ padding: '1rem', color: '#b91c1c' }}>{error}</td></tr> : null}
              {!loading && !error && paged.length === 0 ? <tr><td colSpan={9} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280' }}>{emptyText || 'No tasks available'}</td></tr> : null}
              {!loading && !error ? paged.map((task) => {
                const rowStyle = rowStyleByStatus(task.displayStatus)
                const startDisabled = !canStartTask(task)
                const disableStartTooltip = hasActiveTask && activeTaskId !== task.task_id ? 'Another task is already in progress' : 'Start task'
                return (
                  <tr key={task.task_id} style={{ borderTop: '1px solid #e5e7eb', ...rowStyle }}>
                    {dashboardMode ? <td style={{ padding: '0.55rem 0.75rem' }}>{renderActions(task, startDisabled, disableStartTooltip)}</td> : null}
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }}><span style={badgeStyle(task.displayStatus)}>{task.displayStatus}</span></td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }}>{formatDate(task.due_date)}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', ...cellClampStyle }}>{formatTimeZone(task.due_date, task.start_time, task.end_time, 'Asia/Kolkata')}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', ...cellClampStyle }}>{formatTimeZone(task.due_date, task.start_time, task.end_time, 'America/New_York')}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.candidate_name || '—'}>{task.candidate_name || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.title || '—'}>{task.title || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.is_own_task === 1 ? 'Me' : (task.assigned_to_name || '—')}>{task.is_own_task === 1 ? 'Me' : (task.assigned_to_name || '—')}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.assigned_by_name || '—'}>{task.assigned_by_name || '—'}</td>
                    {!dashboardMode ? <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>
                      <div className="d-flex align-items-center gap-2" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                        <button className="button" title="View task details" onClick={() => setViewTaskId(task.task_id)} style={{ width: 32, height: 32, minWidth: 32, padding: 0, cursor: 'pointer' }}>👁</button>
                        {getResumeUrl(task) ? (
                          <button
                            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                            title="Download Resume"
                            onClick={() => window.open(getResumeUrl(task), '_blank', 'noopener,noreferrer')}
                            style={{ width: 32, height: 32, minWidth: 32, padding: 0, justifyContent: 'center' }}
                          >
                            <BsDownload size={14} />
                          </button>
                        ) : null}
                        {task.file_url ? <button className="button" title="Download file" onClick={() => void downloadFile(task.file_url)} style={{ width: 32, height: 32, minWidth: 32, padding: 0, cursor: 'pointer' }}>⬇</button> : null}
                        {(task.displayStatus === 'Pending' || task.displayStatus === 'Assigned') ? (
                          <button className="button button--primary" title={disableStartTooltip} disabled={startDisabled} onClick={() => setStartTaskId(task.task_id)} style={{ height: 32, padding: '0 10px', borderRadius: 8 }}>▶ Start</button>
                        ) : null}
                        {canEndTask(task) ? (
                          <button className="button button--primary" title="End task" onClick={() => openEndTaskModal(task.task_id)} style={{ height: 32, padding: '0 10px', borderRadius: 8 }}>✅ End</button>
                        ) : null}
                      </div>
                    </td> : null}
                  </tr>
                )
              }) : null}
            </tbody>
          </table>
        </div>
      )}

      <div className={dashboardMode ? 'expert-dashboard__task-pagination' : undefined} style={{ borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', alignItems: 'center', padding: '0.85rem 1rem' }}>
        <span style={{ marginRight: 'auto' }}>Showing {sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, sorted.length)} of {sorted.length} records</span>
        <label>Rows per page<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} style={{ marginLeft: 8 }}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button className="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
        {dashboardMode ? Array.from({ length: Math.min(totalPages, 4) }, (_, index) => index + 1).map((number) => <button className={`button${safePage === number ? ' button--primary' : ''}`} key={number} onClick={() => setPage(number)}>{number}</button>) : null}
        {dashboardMode && totalPages > 5 ? <><span>…</span><button className="button" onClick={() => setPage(totalPages)}>{totalPages}</button></> : null}
        <button className="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
      </div>

      <TaskDetailsModal
        isOpen={Boolean(selectedTask)}
        role="expert"
        task={selectedTask ? {
          taskId: selectedTask.task_id,
          title: selectedTask.title || 'Task Details',
          status: selectedTask.displayStatus,
          candidateName: selectedTask.candidate_name || '—',
          supportType: selectedTask.support_type || '—',
          assignedTo: selectedTask.is_own_task === 1 ? 'Me' : (selectedTask.assigned_to_name || '—'),
          assignedBy: selectedTask.assigned_by_name || '—',
          dueDate: selectedTask.due_date,
          startTime: selectedTask.start_time,
          endTime: selectedTask.end_time,
          description: selectedTask.description || '',
        } : null}
        onClose={() => setViewTaskId(null)}
        commentsRefreshKey={commentsRefreshKey}
        headerActions={
          selectedTask ? (
            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {(selectedTask.displayStatus === 'Pending' || selectedTask.displayStatus === 'Assigned') ? (
                <button className="button button--primary" title={hasActiveTask && activeTaskId !== selectedTask.task_id ? 'Another task is already in progress' : 'Start task'} disabled={!canStartTask(selectedTask)} onClick={() => setStartTaskId(selectedTask.task_id)} style={{ borderRadius: 8 }}>▶ Task</button>
              ) : null}
              {canEndTask(selectedTask) ? (
                <button className="button button--primary" onClick={() => openEndTaskModal(selectedTask.task_id)} style={{ borderRadius: 8 }}>✅ End Task</button>
              ) : null}
              {selectedTask.file_url ? (
                <button className="button" onClick={() => void downloadFile(selectedTask.file_url)} title="Download file">⬇</button>
              ) : null}
            </div>
          ) : null
        }
      />

      {startTaskId ? (
        <div className="modal-overlay" onClick={() => setStartTaskId(null)}>
          <div className="modal-card" style={{ width: 'min(560px, 100%)', padding: '1.25rem' }} onClick={(event) => event.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Start Task</h3>
            <p style={{ margin: '0.8rem 0 1rem', fontSize: 14 }}>Are you sure you want to start this task?</p>
            {actionError ? <p style={{ color: '#b91c1c', fontSize: 13 }}>{actionError}</p> : null}
            <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="button" onClick={() => setStartTaskId(null)} disabled={actionLoading}>Cancel</button>
              <button className="button button--primary" onClick={() => void handleStartTask()} disabled={actionLoading}>{actionLoading ? 'Starting...' : 'Yes, Start Task'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {endTaskId ? (
        <div className="modal-overlay" onClick={() => setEndTaskId(null)}>
          <div className="modal-card" style={{ width: 'min(680px, 100%)', padding: '1.25rem' }} onClick={(event) => event.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18 }}>End Task</h3>
            <div style={{ display: 'grid', gap: '0.85rem', marginTop: '0.9rem' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Status
                <select value={endStatus} onChange={(event) => setEndStatus(event.target.value as EndTaskStatus)} style={{ border: '1px solid #d1d5db', borderRadius: 8, minHeight: 38, padding: '0 0.6rem' }}>
                  <option value="">Select status</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No Show">No Show</option>
                  <option value="Rescheduled">Rescheduled</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                Comment
                <textarea value={endComment} onChange={(event) => setEndComment(event.target.value)} placeholder="Enter task outcome / feedback..." style={{ border: '1px solid #d1d5db', borderRadius: 8, minHeight: 100, padding: '0.6rem', resize: 'vertical' }} />
              </label>
            </div>
            {actionError ? <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 10 }}>{actionError}</p> : null}
            <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="button" onClick={() => setEndTaskId(null)} disabled={actionLoading}>Cancel</button>
              <button className="button button--primary" onClick={() => void submitEndTask()} disabled={actionLoading}>{actionLoading ? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ExpertTaskTable
