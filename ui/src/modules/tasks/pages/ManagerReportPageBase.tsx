import { useEffect, useMemo, useState } from 'react'
import { BsArrowDownUp, BsEye } from 'react-icons/bs'
import { getTaskFilterOptions, getManagerReportList, getManagerReportTaskDetails, type ManagerReportFilters } from '../api/tasksApi'
import { useAlert } from '../../../shared/alerts/useAlert'
import { getClients } from '../../clients/api/clientsApi'
import { formatEST, formatIST, parseISTDateTime } from '../../../utils/timezone'

export type ReportColumn = { key: string; label: string }

type ReportPageProps = {
  title: string
  subtitle?: string
  columns: ReportColumn[]
  endpoint: string
}

type SortConfig = { key: string; direction: 'asc' | 'desc' }

type Option = { id: number; name: string }
type PaginationState = { totalRecords: number; totalPages: number; page: number; limit: number }

const asString = (value: unknown) => value === undefined || value === null ? '' : String(value).trim()

const withoutZoneSuffix = (value: string, suffix: string) => value.endsWith(` ${suffix}`) ? value.slice(0, -suffix.length - 1) : value

const getScheduleDate = (row: Record<string, unknown>) => {
  const dueDate = asString(row.due_date ?? row.task_date)
  if (dueDate) return dueDate.slice(0, 10)
  const scheduledStart = asString(row.scheduled_start_time)
  const scheduledEnd = asString(row.scheduled_end_time)
  return (scheduledStart || scheduledEnd).slice(0, 10)
}

const getScheduleText = (row: Record<string, unknown>) => {
  const startTime = asString(row.scheduled_start_time)
  const endTime = asString(row.scheduled_end_time)
  if (!startTime && !endTime) return '--'

  const scheduleDate = getScheduleDate(row)
  const startDate = startTime ? parseISTDateTime(scheduleDate, startTime) : null
  const endDate = endTime ? parseISTDateTime(scheduleDate, endTime) : null
  if (!startDate && !endDate) return '--'

  const istStart = startDate ? withoutZoneSuffix(formatIST(startDate), 'IST') : '--'
  const istEnd = endDate ? withoutZoneSuffix(formatIST(endDate), 'IST') : '--'
  const estStart = startDate ? withoutZoneSuffix(formatEST(startDate), 'EST') : '--'
  const estEnd = endDate ? withoutZoneSuffix(formatEST(endDate), 'EST') : '--'

  return `IST: ${istStart} - ${istEnd}\nEST: ${estStart} - ${estEnd}`
}

const renderSchedule = (row: Record<string, unknown>) => {
  const scheduleText = getScheduleText(row)
  if (scheduleText === '--') return scheduleText
  const [istLine, estLine] = scheduleText.split('\n')

  return (
    <div className="manager-schedule-cell">
      <div><strong>IST:</strong> {istLine.replace('IST: ', '')}</div>
      <div><strong>EST:</strong> {estLine.replace('EST: ', '')}</div>
    </div>
  )
}

const ManagerReportPageBase = ({ title, subtitle, columns, endpoint }: ReportPageProps) => {
  const { showToast } = useAlert()
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'task_id', direction: 'asc' })
  const [filters, setFilters] = useState<ManagerReportFilters>({ page: 1, limit: 10 })
  const [options, setOptions] = useState<{ candidates: Option[]; assignees: Option[]; taskTypes: Option[]; clients: Option[] }>({ candidates: [], assignees: [], taskTypes: [], clients: [] })
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [pagination, setPagination] = useState<PaginationState>({ totalRecords: 0, totalPages: 0, page: 1, limit: 10 })
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async (override?: ManagerReportFilters) => {
    setLoading(true)
    setError(null)
    try {
      const payload = { ...filters, ...override }
      const result = await getManagerReportList(endpoint, payload)
      const requestedPage = Number(payload.page ?? 1)
      if (result.items.length === 0 && requestedPage > 1 && result.total_pages > 0) {
        const retryPage = result.total_pages
        const retry = await getManagerReportList(endpoint, { ...payload, page: retryPage })
        setRows(retry.items.map((r) => (r as Record<string, unknown>)))
        setPagination({ totalRecords: retry.total_records, totalPages: retry.total_pages, page: retry.page || retryPage, limit: retry.limit || Number(payload.limit ?? 10) })
        setFilters((prev) => ({ ...prev, page: retry.page || retryPage }))
      } else {
        setRows(result.items.map((r) => (r as Record<string, unknown>)))
        setPagination({ totalRecords: result.total_records, totalPages: result.total_pages, page: result.page || requestedPage, limit: result.limit || Number(payload.limit ?? 10) })
        if (result.page > 0 && result.page !== requestedPage) setFilters((prev) => ({ ...prev, page: result.page }))
      }
      setLastUpdated(new Date())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load report'
      setError(message)
      showToast({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([getTaskFilterOptions(), getClients()]).then(([data, clients]) => {
      setOptions({ candidates: data.candidates, assignees: data.assignees, taskTypes: data.task_types, clients: clients.map((c) => ({ id: c.id, name: c.company_name })) })
    })
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  const sortedRows = useMemo(() => {
    const rowsCopy = [...rows]
    return rowsCopy.sort((a, b) => {
      const valueA = String(a[sortConfig.key] ?? '')
      const valueB = String(b[sortConfig.key] ?? '')
      const compare = valueA.localeCompare(valueB, undefined, { numeric: true })
      return sortConfig.direction === 'asc' ? compare : -compare
    })
  }, [rows, sortConfig])

  const onSort = (key: string) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))

  const openDetails = async (taskId: number) => {
    setSelectedTaskId(taskId)
    setDetailsLoading(true)
    try { setDetails(await getManagerReportTaskDetails(taskId)) } catch (e) { showToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load task details' }) } finally { setDetailsLoading(false) }
  }

  const mapValue = (row: Record<string, unknown>, key: string) => {
    if (key === 'schedule') return getScheduleText(row)

    const mapping: Record<string, string[]> = {
      taskId: ['task_id'],
      candidate: ['candidate_name', 'candidate'],
      clientCompany: ['company_name', 'client_company'],
      technicalExpert: ['technical_expert'],
      assignedBy: ['assigned_by'],
      taskType: ['task_type'],
      status: ['task_status', 'status'],
      dueDate: ['due_date'],
      feedbackSubmittedDate: ['feedback_date'],
      averageScore: ['average_score'],
      estTime: ['est_time'],
      schedule: ['scheduled_start_time', 'scheduled_end_time'],
      duration: ['duration'],
    }
    const aliases = mapping[key] ?? [key]
    for (const alias of aliases) if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return row[alias]
    return '—'
  }

  const renderCell = (row: Record<string, unknown>, key: string) => key === 'schedule' ? renderSchedule(row) : String(mapValue(row, key))
  const serverPagination = pagination.totalPages > 0
  const currentPage = serverPagination ? pagination.page : (filters.page ?? 1)
  const pageLimit = serverPagination ? pagination.limit : Number(filters.limit ?? 10)
  const pageNumbers = serverPagination
    ? [Math.max(1, currentPage - 1), currentPage, Math.min(pagination.totalPages, currentPage + 1)].filter((v, i, a) => v >= 1 && v <= pagination.totalPages && a.indexOf(v) === i)
    : [Math.max(1, currentPage - 1), currentPage, currentPage + 1].filter((v, i, a) => a.indexOf(v) === i)
  const nextDisabled = serverPagination ? currentPage >= pagination.totalPages : rows.length < pageLimit

  return (
    <div className="page-container">
      <div className="page-container__header"><div><h1 className="page-title mb-1">{title}</h1><p className="page-description mb-0">{subtitle ?? 'Live manager reporting dashboard.'}</p></div><div className="d-flex gap-2"><button className="btn btn-outline-secondary btn-sm" onClick={() => void load()}>Refresh</button></div></div>
      <small className="text-muted">{lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Last updated: --'}</small>
      <div className="card"><h3 className="card-title mb-3">Filters</h3><div className="row g-2 g-md-3">
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Candidate</label><select className="form-select" value={filters.candidate_id ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, candidate_id: e.target.value }))}><option value="">All Candidate</option>{options.candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Technical Expert</label><select className="form-select" value={filters.expert_id ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, expert_id: e.target.value }))}><option value="">All Technical Expert</option>{options.assignees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Task Type</label><select className="form-select" value={filters.task_type_id ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, task_type_id: e.target.value }))}><option value="">All Task Type</option>{options.taskTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Client Company</label><select className="form-select" value={filters.client_id ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, client_id: e.target.value }))}><option value="">All Client Company</option>{options.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">From Date</label><input type="date" className="form-control" value={filters.from_date ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, from_date: e.target.value }))} /></div>
        <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">To Date</label><input type="date" className="form-control" value={filters.to_date ?? ''} onChange={(e) => setFilters((p) => ({ ...p, page: 1, to_date: e.target.value }))} /></div>
        <div className="col-12 d-flex gap-2 justify-content-end mt-2"><button className="btn btn-primary btn-sm" type="button" onClick={() => { setFilters((p) => ({ ...p, page: 1 })); void load({ page: 1 }) }}>Apply Filter</button><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setFilters({ page: 1, limit: 10 }); void load({ page: 1, limit: 10 }) }}>Reset</button></div>
      </div></div>

      <div className="table-card"><div className="d-flex justify-content-end p-2"><button className="btn btn-success btn-sm" onClick={() => {
        const head = columns.filter((c) => c.key !== 'action').map((c) => c.label).join(',')
        const body = sortedRows.map((r) => columns.filter((c) => c.key !== 'action').map((c) => `\"${String(mapValue(r, c.key)).replaceAll('\"', '\"\"')}\"`).join(',')).join('\n')
        const blob = new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`; a.click()
      }}>Export Excel</button></div><div className="table-wrapper manager-reports-table__wrapper"><table className="table table-hover table-bordered align-middle manager-reports-table mb-0"><thead><tr>{columns.map((column) => <th key={column.key} className={column.key === 'action' ? 'manager-col-action' : column.key === 'taskId' ? 'manager-col-taskid' : ''}>{column.key === 'action' ? <span /> : <button type="button" className="manager-sort" onClick={() => onSort(column.key)}><span>{column.label}</span><BsArrowDownUp size={12} /></button>}</th>)}</tr></thead><tbody>{loading ? <tr>{columns.map((_, i) => <td key={i}><div className="placeholder-glow"><span className="placeholder col-10" /></div></td>)}</tr> : sortedRows.length === 0 ? <tr><td colSpan={columns.length} className="text-center">No data found.</td></tr> : sortedRows.map((row, idx) => <tr key={`${String(mapValue(row, 'taskId'))}-${idx}`}>{columns.map((column) => column.key === 'action' ? <td key={`${idx}-action`} className="text-center manager-col-action"><button className="btn btn-outline-primary btn-sm rounded-pill" onClick={() => void openDetails(Number(row.task_id ?? 0))}><BsEye size={15} className="text-primary" /></button></td> : <td key={`${idx}-${column.key}`} className={`manager-cell ${column.key === 'taskId' ? 'manager-col-taskid' : ''}`} title={column.key === 'schedule' ? undefined : String(mapValue(row, column.key))}><span className={column.key === 'schedule' ? '' : 'manager-cell-ellipsis'}>{renderCell(row, column.key)}</span></td>)}</tr>)}</tbody></table></div></div>

      <div className="card py-2 px-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"><div className="d-flex align-items-center gap-2"><small className="text-muted">Rows:</small><select className="form-select form-select-sm" style={{ width: 90 }} value={String(filters.limit ?? 10)} onChange={(e) => { const limit = Number(e.target.value); setFilters((p) => ({ ...p, page: 1, limit })); void load({ page: 1, limit }) }}><option value="10">10</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></select><small className="text-muted">Page {currentPage}{serverPagination ? ` of ${pagination.totalPages} (${pagination.totalRecords} records)` : ''}</small></div><nav><ul className="pagination mb-0"><li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => { const page = Math.max(1, currentPage - 1); setFilters((p) => ({ ...p, page })); void load({ page }) }}>Previous</button></li>{pageNumbers.map((pageNo) => <li key={pageNo} className={`page-item ${pageNo === currentPage ? 'active' : ''}`}><button className="page-link" onClick={() => { setFilters((p) => ({ ...p, page: pageNo })); void load({ page: pageNo }) }}>{pageNo}</button></li>)}<li className={`page-item ${nextDisabled ? 'disabled' : ''}`}><button className="page-link" onClick={() => { const page = currentPage + 1; setFilters((p) => ({ ...p, page })); void load({ page }) }}>Next</button></li></ul></nav></div>
      {error ? <div className="alert alert-danger">{error} <button className="btn btn-link btn-sm" onClick={() => void load()}>Retry</button></div> : null}

      <div className={`modal fade ${selectedTaskId ? 'show d-block' : ''}`} tabIndex={-1} role="dialog" aria-modal={selectedTaskId ? 'true' : 'false'}><div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Task Details: {String(details.task_id ?? selectedTaskId ?? '')}</h5><button type="button" className="btn-close" onClick={() => setSelectedTaskId(null)} aria-label="Close" /></div><div className="modal-body">{detailsLoading ? <div className="placeholder-glow"><span className="placeholder col-12" /><span className="placeholder col-10" /><span className="placeholder col-8" /></div> : <div className="row g-3"><div className="col-12 col-lg-6"><div className="card h-100"><h6>Candidate Details</h6><p className="mb-1"><strong>Name:</strong> {String(details.candidate_name ?? details.candidate ?? '—')}</p><p className="mb-1"><strong>Email:</strong> {String(details.candidate_email ?? '—')}</p><p className="mb-1"><strong>Contact:</strong> {String(details.contact_number ?? '—')}</p><p className="mb-0"><strong>Company:</strong> {String(details.company_name ?? details.client_company ?? '—')}</p></div></div><div className="col-12 col-lg-6"><div className="card h-100"><h6>Task Details</h6><p className="mb-1"><strong>Task ID:</strong> {String(details.task_id ?? '—')}</p><p className="mb-1"><strong>Type:</strong> {String(details.task_type ?? '—')}</p><p className="mb-1"><strong>Status:</strong> {String(details.task_status ?? details.status ?? '—')}</p><p className="mb-1"><strong>Due Date:</strong> {String(details.due_date ?? '—')}</p><p className="mb-1"><strong>Start:</strong> {String(details.task_start_time ?? details.start_time ?? '—')}</p><p className="mb-1"><strong>End:</strong> {String(details.task_end_time ?? details.end_time ?? '—')}</p><p className="mb-0"><strong>Duration:</strong> {String(details.duration ?? '—')}</p></div></div><div className="col-12"><div className="card"><h6>Initial Comment</h6><p className="mb-0">{String(details.initial_comment ?? '—')}</p></div></div><div className="col-12"><div className="card"><h6>Detailed Feedback</h6><p className="mb-1"><strong>Communication:</strong> {String(details.communication ?? '—')}</p><p className="mb-1"><strong>Technical:</strong> {String(details.technical ?? '—')}</p><p className="mb-1"><strong>Confidence:</strong> {String(details.confidence ?? '—')}</p><p className="mb-1"><strong>Project Explanation:</strong> {String(details.project_explanation ?? '—')}</p><p className="mb-1"><strong>Overall:</strong> {String(details.overall ?? '—')}</p><p className="mb-1"><strong>Area of Improvements:</strong> {String(details.area_of_improvements ?? '—')}</p><p className="mb-1"><strong>Average Score:</strong> {String(details.average_score ?? '—')}</p><p className="mb-0"><strong>Feedback Date:</strong> {String(details.feedback_date ?? '—')}</p></div></div></div>}</div></div></div></div>
      {selectedTaskId ? <div className="modal-backdrop fade show" /> : null}
    </div>
  )
}

export default ManagerReportPageBase
