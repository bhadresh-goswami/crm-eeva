import { useMemo, useState, type CSSProperties } from 'react'
import { apiFetch } from '../../../api/client'
import type { ExpertTaskItem } from '../api/expertTasksApi'

type ExpertTaskTableProps = {
  tasks: ExpertTaskItem[]
  loading: boolean
  error: string | null
  emptyText: string
  currentUserId: number
}

const pageSizes = [5, 10, 20]

const statusLabel = (statusName: string) => {
  const value = statusName.trim().toLowerCase()
  if (value.includes('pending')) return 'Pending'
  if (value.includes('assign')) return 'Assigned'
  if (value.includes('progress')) return 'In Progress'
  if (value.includes('complete')) return 'Completed'
  if (value.includes('cancel')) return 'Cancelled'
  if (value.includes('show')) return 'No Show'
  return 'Unknown'
}

const badgeStyle = (label: string): CSSProperties => {
  const map: Record<string, { bg: string; color: string }> = {
    Pending: { bg: '#e5e7eb', color: '#374151' },
    Assigned: { bg: '#dbeafe', color: '#1d4ed8' },
    'In Progress': { bg: '#fef3c7', color: '#92400e' },
    Completed: { bg: '#dcfce7', color: '#166534' },
    Cancelled: { bg: '#fee2e2', color: '#991b1b' },
    'No Show': { bg: '#ffedd5', color: '#9a3412' },
    Unknown: { bg: '#f3f4f6', color: '#4b5563' },
  }
  const style = map[label] ?? map.Unknown
  return { background: style.bg, color: style.color, borderRadius: 999, padding: '0.22rem 0.7rem', fontWeight: 600, fontSize: 12 }
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

const ExpertTaskTable = ({ tasks, loading, error, emptyText, currentUserId }: ExpertTaskTableProps) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'my' | 'sub'>('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [viewTaskId, setViewTaskId] = useState<number | null>(null)

  const mapped = useMemo(
    () => tasks.map((task) => ({ ...task, displayStatus: statusLabel(task.status_name) })),
    [tasks],
  )

  const filtered = useMemo(() => {
    return mapped.filter((task) => {
      const searchable = `${task.title} ${task.candidate_name} ${task.company_name} ${task.assigned_to_name} ${task.assigned_by_name}`.toLowerCase()
      const matchesSearch = searchable.includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || task.displayStatus === statusFilter
      const isMine = task.is_own_task === 1
      const matchesAssignment = assignmentFilter === 'all' || (assignmentFilter === 'my' ? isMine : !isMine)
      return matchesSearch && matchesStatus && matchesAssignment
    })
  }, [assignmentFilter, mapped, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const selectedTask = mapped.find((task) => task.task_id === viewTaskId) ?? null
  const statusOptions = Array.from(new Set(mapped.map((item) => item.displayStatus)))
  const cellClampStyle: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontSize: 13, lineHeight: 1.35 }

  const downloadFile = async (fileName: string) => {
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

  return (
    <div className="card" style={{ borderRadius: 12, overflow: 'hidden', padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.85rem 1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search by title, candidate, assignee..."
          style={{ border: '1px solid #d1d5db', borderRadius: 8, minWidth: 290, padding: '0.45rem 0.6rem', outline: 'none', background: '#fff', fontSize: 13 }}
        />
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '0.45rem 0.6rem', fontSize: 13 }}
          >
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={assignmentFilter}
            onChange={(event) => {
              setAssignmentFilter(event.target.value as 'all' | 'my' | 'sub')
              setPage(1)
            }}
            style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '0.45rem 0.6rem', fontSize: 13 }}
          >
            <option value="all">All Tasks</option>
            <option value="my">My Tasks</option>
            <option value="sub">Sub-user Tasks</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 460 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Date (IST)</th>
              <th style={{ textAlign: 'center', padding: '0.65rem 0.75rem', fontSize: 13 }}>Time (IST)</th>
              <th style={{ textAlign: 'center', padding: '0.65rem 0.75rem', fontSize: 13 }}>Time (EST)</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Candidate Name</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Title</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Assigned To</th>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: 13 }}>Assigned By</th>
              <th style={{ textAlign: 'right', padding: '0.65rem 0.75rem', fontSize: 13 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: '1rem' }}>Loading tasks...</td></tr> : null}
            {!loading && error ? <tr><td colSpan={9} style={{ padding: '1rem', color: '#b91c1c' }}>{error}</td></tr> : null}
            {!loading && !error && paged.length === 0 ? <tr><td colSpan={9} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280' }}>{emptyText || 'No active tasks available'}</td></tr> : null}
            {!loading && !error
              ? paged.map((task) => (
                  <tr
                    key={task.task_id}
                    style={{ borderTop: '1px solid #e5e7eb', background: task.is_own_task === 1 ? '#f8fafc' : '#fff', transition: 'background-color 160ms ease' }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = task.is_own_task === 1 ? '#f8fafc' : '#fff' }}
                  >
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }}><span style={badgeStyle(task.displayStatus)}>{task.displayStatus}</span></td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }}>{formatDate(task.due_date)}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', ...cellClampStyle }}>{formatTimeZone(task.due_date, task.start_time, task.end_time, 'Asia/Kolkata')}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', ...cellClampStyle }}>{formatTimeZone(task.due_date, task.start_time, task.end_time, 'America/New_York')}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.candidate_name || '—'}>{task.candidate_name || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.title || '—'}>{task.title || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.is_own_task === 1 ? 'Me' : (task.assigned_to_name || '—')}>
                      {task.is_own_task === 1 ? 'Me' : (task.assigned_to_name || '—')}
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', ...cellClampStyle }} title={task.assigned_by_name || '—'}>{task.assigned_by_name || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        <button className="button" title="View" onClick={() => setViewTaskId(task.task_id)} style={{ width: 30, height: 30, minWidth: 30, padding: 0, cursor: 'pointer' }}>👁</button>
                        {task.file_url ? (
                          <button className="button" title="Download file" onClick={() => void downloadFile(task.file_url)} style={{ width: 30, height: 30, minWidth: 30, padding: 0, cursor: 'pointer' }}>⬇</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', alignItems: 'center', padding: '0.85rem 1rem' }}>
        <label>
          Rows per page
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} style={{ marginLeft: 8 }}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>{filtered.length === 0 ? '0-0' : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}</span>
        <button className="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
        <button className="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
      </div>

      {selectedTask ? (
        <div className="modal-overlay" onClick={() => setViewTaskId(null)}>
          <div className="modal-card" style={{ width: 'min(1100px, 100%)', maxHeight: '88vh', overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-head" style={{ justifyContent: 'space-between' }}>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>{selectedTask.title || 'Task Details'}</h3>
              <button className="button" onClick={() => setViewTaskId(null)}>✕</button>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.6rem' }}>Basic Info</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(240px, 1fr))', gap: '0.7rem 1rem' }}>
                <div style={{ display: 'grid', gap: '0.7rem' }}>
                  <p><strong>Candidate:</strong> {selectedTask.candidate_name || '—'}</p>
                  <p><strong>Status:</strong> <span style={badgeStyle(selectedTask.displayStatus)}>{selectedTask.displayStatus}</span></p>
                  <p><strong>IST:</strong> {formatDateAndTimeZone(selectedTask.due_date, selectedTask.start_time, selectedTask.end_time, 'Asia/Kolkata')}</p>
                </div>
                <div style={{ display: 'grid', gap: '0.7rem' }}>
                  <p><strong>Date:</strong> {formatDate(selectedTask.due_date)}</p>
                  <p><strong>EST:</strong> {formatDateAndTimeZone(selectedTask.due_date, selectedTask.start_time, selectedTask.end_time, 'America/New_York')}</p>
                  <p><strong>Assigned By:</strong> {selectedTask.assigned_by_name || '-'}</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.6rem' }}>Description</h4>
              <div style={{ maxHeight: 280, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: selectedTask.description || '<p>—</p>' }} />
            </div>

            {selectedTask.file_url ? (
              <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
                <button className="button button--primary" onClick={() => void downloadFile(selectedTask.file_url)}>
                  ⬇ Download File
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ExpertTaskTable
