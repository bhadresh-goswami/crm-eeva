import { useMemo, useState, type CSSProperties } from 'react'
import type { ExpertTaskItem } from '../api/expertTasksApi'

type ExpertTaskTableProps = {
  tasks: ExpertTaskItem[]
  loading: boolean
  error: string | null
  emptyText: string
}

const pageSizes = [5, 10, 20]

const normalizeStatus = (statusName: string, statusId: number) => {
  const value = statusName.trim().toLowerCase()
  if (value) return value
  return String(statusId)
}

const statusLabel = (status: string) => {
  if (status.includes('pending')) return 'Pending'
  if (status.includes('assign')) return 'Assigned'
  if (status.includes('progress')) return 'In Progress'
  if (status.includes('complete')) return 'Completed'
  if (status.includes('cancel')) return 'Cancelled'
  if (status.includes('show')) return 'No Show'
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
  return {
    background: style.bg,
    color: style.color,
    borderRadius: 999,
    padding: '0.2rem 0.65rem',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-block',
  }
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value || '—' : date.toLocaleDateString()
}

const formatTime = (value: string) => (value ? value.slice(0, 5) : '—')

const ExpertTaskTable = ({ tasks, loading, error, emptyText }: ExpertTaskTableProps) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const mapped = useMemo(
    () =>
      tasks.map((task) => {
        const key = normalizeStatus(task.status_name, task.status_id)
        const label = statusLabel(key)
        return { ...task, statusKey: key, statusLabel: label }
      }),
    [tasks],
  )

  const filtered = useMemo(() => {
    return mapped.filter((task) => {
      const searchValue = `${task.task_id} ${task.title} ${task.candidate_name}`.toLowerCase()
      const passSearch = searchValue.includes(search.trim().toLowerCase())
      const passStatus = statusFilter === 'all' || task.statusLabel === statusFilter
      return passSearch && passStatus
    })
  }, [mapped, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const statusOptions = Array.from(new Set(mapped.map((item) => item.statusLabel)))

  return (
    <div className="card" style={{ borderRadius: 12, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search..."
          style={{ border: 'none', borderBottom: '2px solid #d1d5db', padding: '0.5rem 0.25rem', minWidth: 220, outline: 'none' }}
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
          style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #d1d5db' }}
        >
          <option value="all">All Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '0.75rem', width: 44 }}><input type="checkbox" aria-label="Select all" /></th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Title</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '1rem' }}>Loading tasks...</td></tr>
            ) : null}
            {!loading && error ? (
              <tr><td colSpan={7} style={{ padding: '1rem', color: '#b91c1c' }}>{error}</td></tr>
            ) : null}
            {!loading && !error && paged.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '1rem' }}>{emptyText}</td></tr>
            ) : null}
            {!loading && !error
              ? paged.map((task) => (
                  <tr key={task.task_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}><input type="checkbox" aria-label={`Select task ${task.task_id}`} /></td>
                    <td style={{ padding: '0.75rem' }}>{task.task_id}</td>
                    <td style={{ padding: '0.75rem', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${task.candidate_name} - ${task.title}`}>
                      {task.candidate_name ? `${task.candidate_name} - ` : ''}{task.title}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{formatDate(task.due_date)}</td>
                    <td style={{ padding: '0.75rem' }}>{formatTime(task.start_time)} - {formatTime(task.end_time)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={badgeStyle(task.statusLabel)}>{task.statusLabel}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <button className="button" title="View" style={{ marginRight: 6 }}>👁</button>
                      <button className="button" title="Start (future)" style={{ marginRight: 6 }}>▶</button>
                      <button className="button" title="End (future)">⏹</button>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '0.9rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
        <label>
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            style={{ marginLeft: 8 }}
          >
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>{filtered.length === 0 ? '0-0' : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)}`} of {filtered.length}</span>
        <button className="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage <= 1}>‹</button>
        <button className="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage >= totalPages}>›</button>
      </div>
    </div>
  )
}

export default ExpertTaskTable
