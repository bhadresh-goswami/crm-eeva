import { useMemo, useState } from 'react'

type DailyRow = {
  work_date: string
  total_minutes: number
  total_tasks: number
  interview_support: number
  mock_interview: number
  resume_support: number
  linkedin_support: number
  other_tasks: number
  completed_tasks: number
  success_tasks: number
  rejected_tasks: number
  productivity: number
  status: string
}

type DailySummary = {
  average_minutes?: number
  total_minutes?: number
  total_tasks?: number
  productivity?: number
}

type DailyWorkingAnalyticsData = {
  summary?: DailySummary
  rows?: DailyRow[]
}

type DailyWorkingAnalyticsTableProps = {
  data?: DailyWorkingAnalyticsData
  loading?: boolean
  onRecalculateDuration?: () => void
  recalculatingDuration?: boolean
}

const PAGE_SIZE = 10

export const formatMinutesToHours = (minutes: number) => {
  const total = Number(minutes || 0)
  const hrs = Math.floor(total / 60)
  const mins = total % 60

  if (hrs <= 0) return `${mins} min`
  if (mins <= 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`

  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min`
}

const statusBadgeClass = (status: string) => {
  if (status === 'Excellent') return 'bg-success-subtle text-success-emphasis'
  if (status === 'Good') return 'bg-primary-subtle text-primary-emphasis'
  return 'bg-danger-subtle text-danger-emphasis'
}

const rowClassName = (minutes: number) => {
  if (minutes >= 480) return 'table-success'
  if (minutes >= 300) return 'table-warning'
  return 'table-danger'
}

const DailyWorkingAnalyticsTable = ({
  data = { summary: {}, rows: [] },
  loading = false,
  onRecalculateDuration,
  recalculatingDuration = false,
}: DailyWorkingAnalyticsTableProps) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data.rows ?? []
    return (data.rows ?? []).filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(q)))
  }, [data.rows, search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (<div className="card border-0 shadow-sm rounded-4"><div className="card-body p-4"><div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"><div><h5 className="mb-1">Daily Working Hours Analytics</h5><p className="text-muted mb-0">Last 30 days work tracking and task productivity insights.</p></div><div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-outline-primary" onClick={onRecalculateDuration} disabled={loading || recalculatingDuration || !onRecalculateDuration}>{recalculatingDuration ? 'Recalculating...' : 'Recalculate Duration'}</button><input className="form-control" style={{ maxWidth: 280 }} placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div></div>

    <div className="row g-2 mb-3"><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Average Hours</small><strong>{formatMinutesToHours(data.summary?.average_minutes ?? 0)}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Total Hours</small><strong>{formatMinutesToHours(data.summary?.total_minutes ?? 0)}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Total Tasks</small><strong>{data.summary?.total_tasks ?? 0}</strong></div></div><div className="col-6 col-lg-3"><div className="border rounded-3 p-2"><small className="text-muted d-block">Productivity Avg %</small><strong>{data.summary?.productivity ?? 0}%</strong></div></div></div>

    <div className="table-responsive" style={{ maxHeight: 480 }}><table className="table table-hover table-striped align-middle mb-0"><thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>{['Date', 'Working Hours', 'Total Tasks', 'Interview Support', 'Mock Interview', 'Resume Support', 'LinkedIn Support', 'Other Tasks', 'Completed', 'Success', 'Rejected', 'Productivity %', 'Status'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={13} className="text-center py-4">Loading...</td></tr> : paginatedRows.length === 0 ? <tr><td colSpan={13} className="text-center py-4">No working hours data found in last 30 days</td></tr> : paginatedRows.map((row) => (<tr key={row.work_date} className={rowClassName(row.total_minutes)}><td>{row.work_date}</td><td>{formatMinutesToHours(row.total_minutes)}</td><td>{row.total_tasks}</td><td>{row.interview_support}</td><td>{row.mock_interview}</td><td>{row.resume_support}</td><td>{row.linkedin_support}</td><td>{row.other_tasks}</td><td>{row.completed_tasks}</td><td>{row.success_tasks}</td><td>{row.rejected_tasks}</td><td>{row.productivity}%</td><td><span className={`badge ${statusBadgeClass(row.status)}`}>{row.status}</span></td></tr>))}</tbody></table></div>

    <div className="d-flex justify-content-end align-items-center gap-2 mt-3"><button className="btn btn-sm btn-outline-secondary" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button><span className="small text-muted">Page {safePage} of {totalPages}</span><button className="btn btn-sm btn-outline-secondary" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button></div>
  </div></div>)
}

export default DailyWorkingAnalyticsTable
