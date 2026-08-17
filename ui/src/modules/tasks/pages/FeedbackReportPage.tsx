import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BsArrowClockwise, BsCheck, BsChevronBarLeft, BsChevronBarRight, BsChevronDown, BsChevronLeft, BsChevronRight, BsClock, BsEye, BsExclamation, BsFunnel, BsInfoCircle, BsPerson, BsSearch, BsX } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import ExpertWorkspaceHeader from '../../../shared/components/ExpertWorkspaceHeader'
import { useAuth } from '../../../context/AuthContext'
import { getAllFeedback } from '../api/feedbackApi'
import FeedbackModal from '../components/FeedbackModal'
// @ts-ignore legacy service is shared with the existing expert reports endpoint
import { loadTaskForFeedback } from '../services/expertTaskReportsService'
import './expertTaskReports.css'

type Row = Record<string, unknown>
type ExpertRow = Row & { id: number }
type GroupKey = 'week' | 'month' | 'earlier'
type Filters = { search: string; candidate_name: string; task_type: string; date_preset: string; date_from: string; date_to: string }

const emptyFilters: Filters = { search: '', candidate_name: '', task_type: '', date_preset: '', date_from: '', date_to: '' }
const groupInfo: Record<GroupKey, { title: string; subtitle: string; empty: string }> = {
  week: { title: 'Current Week', subtitle: 'Feedback submitted this week', empty: 'No feedback submitted this week.' },
  month: { title: 'Current Month', subtitle: 'Feedback submitted this month (excluding this week)', empty: 'No additional feedback submitted this month.' },
  earlier: { title: 'All Previous Feedback', subtitle: 'Feedback submitted before this month', empty: 'No previous feedback found.' },
}

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateBounds = (preset: string, from: string, to: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (preset === 'today') return { from: localDate(today), to: localDate(today) }
  if (preset === 'week') { const start = new Date(today); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return { from: localDate(start), to: localDate(today) } }
  if (preset === 'month') return { from: localDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: localDate(today) }
  if (preset === 'last30' || preset === 'last90') { const start = new Date(today); start.setDate(start.getDate() - (preset === 'last30' ? 29 : 89)); return { from: localDate(start), to: localDate(today) } }
  return preset === 'custom' ? { from, to } : { from: '', to: '' }
}
const pagesToShow = (page: number, total: number) => Array.from(new Set([1, total, page - 1, page, page + 1].filter(n => n > 0 && n <= total))).sort((a, b) => a - b)
const prettyDate = (value: unknown) => {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: String(value).includes(':') ? 'short' : undefined }).format(date)
}

const statusDetails = (value: unknown) => {
  const status = String(value || 'Completed').trim()
  const normalized = status.toLowerCase()
  if (normalized.includes('cancel') || normalized.includes('reject') || normalized.includes('no show')) return { label: status || 'Cancelled', kind: 'cancelled', icon: <BsX /> }
  if (normalized.includes('review')) return { label: status || 'Pending Review', kind: 'review', icon: <BsExclamation /> }
  if (normalized.includes('pending')) return { label: status || 'Pending', kind: 'pending', icon: <BsClock /> }
  if (normalized.includes('assign')) return { label: status || 'Assigned', kind: 'assigned', icon: <BsPerson /> }
  return { label: status || 'Completed', kind: 'completed', icon: <BsCheck /> }
}

const numericRating = (row: ExpertRow) => {
  const value = row.rating ?? row.overall_rating ?? row.overall
  const rating = Number(value)
  return value !== null && value !== '' && Number.isFinite(rating) ? rating.toFixed(1) : '—'
}

const StatusIcon = ({ value }: { value: unknown }) => {
  const status = statusDetails(value)
  return <span className={`report-status-icon report-status-${status.kind}`} title={status.label} aria-label={status.label}>{status.icon}</span>
}

const SubmittedTable = ({ rows, loading, empty, filtered, onView }: { rows: ExpertRow[]; loading: boolean; empty: string; filtered: boolean; onView: (row: ExpertRow) => void }) => <div className="feedback-table-wrap">
  <table className="feedback-table submitted-feedback-table"><thead><tr><th>Action</th><th>Feedback date</th><th>Task date</th><th>Candidate</th><th>Task type</th><th>Task / title</th><th>Status</th><th>Rating</th></tr></thead>
    <tbody>{loading ? <tr><td colSpan={8} className="feedback-empty"><span className="spinner-border spinner-border-sm text-primary" /> Loading submitted feedback…</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="feedback-empty">{filtered ? 'No feedback matches the selected filters.' : empty}</td></tr> : rows.map(row => <tr key={row.id}>
      <td><button className="feedback-action view" onClick={() => onView(row)} title="View Feedback" aria-label="View Feedback"><BsEye /></button></td>
      <td>{prettyDate(row.feedback_submitted_at)}</td><td>{prettyDate(row.task_date)}</td><td className="feedback-person">{String(row.candidate_name || '—')}</td><td>{String(row.task_type || '—')}</td>
      <td>{String(row.task_title || row.title || `Task #${row.id}`)}</td><td><StatusIcon value={row.status_name} /></td><td className="report-rating">{numericRating(row)}</td>
    </tr>)}</tbody></table></div>

const ExpertFeedbackReport = () => {
  const { user } = useAuth()
  const expertId = Number((user as unknown as Record<string, unknown>)?.expert_id ?? (user as unknown as Record<string, unknown>)?.user_id ?? user?.id ?? 0)
  const [draft, setDraft] = useState(emptyFilters); const [filters, setFilters] = useState(emptyFilters)
  const [groups, setGroups] = useState<Record<GroupKey, ExpertRow[]>>({ week: [], month: [], earlier: [] }); const [totals, setTotals] = useState<Record<GroupKey, number>>({ week: 0, month: 0, earlier: 0 })
  const [expanded, setExpanded] = useState<Record<GroupKey, boolean>>({ week: true, month: true, earlier: true }); const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(10); const [loading, setLoading] = useState(false); const [selected, setSelected] = useState<ExpertRow | null>(null)
  const panelRef = useRef<HTMLDivElement>(null); const activeCount = [filters.candidate_name, filters.task_type, filters.date_preset].filter(Boolean).length
  const dates = useMemo(() => dateBounds(filters.date_preset, filters.date_from, filters.date_to), [filters])
  const fetchRows = useCallback(async () => {
    if (!expertId) return
    setLoading(true)
    try {
      const common = { search: filters.search, candidate_name: filters.candidate_name, task_type: filters.task_type, feedback_status: 'submitted', date_from: dates.from, date_to: dates.to }
      const keys: GroupKey[] = ['week', 'month', 'earlier']
      const results = await Promise.all(keys.map(key => loadTaskForFeedback({ ...common, feedback_group: key, page: key === 'earlier' ? page : 1, limit: key === 'earlier' ? limit : 500 })))
      const nextGroups = {} as Record<GroupKey, ExpertRow[]>; const nextTotals = {} as Record<GroupKey, number>
      keys.forEach((key, index) => { nextGroups[key] = (results[index].items || []).map((row: Row) => ({ ...row, id: Number(row.task_id ?? row.id) })); nextTotals[key] = Number(results[index].pagination?.total_records || 0) })
      setGroups(nextGroups); setTotals(nextTotals)
    } finally { setLoading(false) }
  }, [expertId, filters, dates.from, dates.to, page, limit])
  useEffect(() => { void fetchRows() }, [fetchRows])
  useEffect(() => {
    const close = (event: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setFilterOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setFilterOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [])
  const options = useMemo(() => ({ candidates: [...new Set(Object.values(groups).flat().map(row => String(row.candidate_name || '')).filter(Boolean))].sort(), types: [...new Set(Object.values(groups).flat().map(row => String(row.task_type || '')).filter(Boolean))].sort() }), [groups])
  const clear = () => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1) }
  const totalSubmitted = totals.week + totals.month + totals.earlier
  return <PageContainer><ExpertWorkspaceHeader title="Feedback Reports" /><main className="feedback-workspace feedback-report-workspace">
    <div className="feedback-toolbar report-toolbar"><label className="feedback-search"><BsSearch /><input value={draft.search} placeholder="Search feedback, candidate, task…" onChange={event => setDraft(current => ({ ...current, search: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') { setFilters(draft); setPage(1) } }} /></label>
      <div className="feedback-filter-anchor" ref={panelRef}><button className={`toolbar-button ${activeCount ? 'active' : ''}`} onClick={() => setFilterOpen(value => !value)} aria-expanded={filterOpen}><BsFunnel /> Filter {activeCount > 0 && <b>{activeCount}</b>} <BsChevronDown /></button>
        {filterOpen && <div className="quick-filter-panel report-filter-panel"><div className="quick-filter-heading"><div><strong>Quick Filters</strong><small>Filter all submitted feedback groups</small></div><button onClick={() => setFilterOpen(false)} aria-label="Close"><BsX /></button></div>
          <div className="quick-filter-grid report-filter-grid"><label>Candidate<select value={draft.candidate_name} onChange={event => setDraft(current => ({ ...current, candidate_name: event.target.value }))}><option value="">All candidates</option>{options.candidates.map(value => <option key={value}>{value}</option>)}</select></label><label>Task Type<select value={draft.task_type} onChange={event => setDraft(current => ({ ...current, task_type: event.target.value }))}><option value="">All task types</option>{options.types.map(value => <option key={value}>{value}</option>)}</select></label><label>Feedback Date<select value={draft.date_preset} onChange={event => setDraft(current => ({ ...current, date_preset: event.target.value }))}><option value="">Any date</option><option value="today">Today</option><option value="week">Current Week</option><option value="month">Current Month</option><option value="last30">Last 30 Days</option><option value="last90">Last 90 Days</option><option value="custom">Custom Date Range</option></select></label></div>
          {draft.date_preset === 'custom' && <div className="custom-dates"><label>Date From<input type="date" value={draft.date_from} onChange={event => setDraft(current => ({ ...current, date_from: event.target.value }))} /></label><label>Date To<input type="date" value={draft.date_to} onChange={event => setDraft(current => ({ ...current, date_to: event.target.value }))} /></label></div>}
          <div className="quick-filter-footer"><button onClick={clear}>Clear All</button><button className="apply" onClick={() => { setFilters(draft); setPage(1); setFilterOpen(false) }}>Apply Filters</button></div></div>}
      </div><span className="submitted-total">{totalSubmitted} feedback records</span><button className="toolbar-button refresh" onClick={() => void fetchRows()} disabled={loading}><BsArrowClockwise className={loading ? 'is-spinning' : ''} /> Refresh</button></div>
    {activeCount > 0 && <div className="active-filter-chips">{filters.candidate_name && <button onClick={() => { const next = { ...filters, candidate_name: '' }; setFilters(next); setDraft(next); setPage(1) }}>Candidate: {filters.candidate_name} <BsX /></button>}{filters.task_type && <button onClick={() => { const next = { ...filters, task_type: '' }; setFilters(next); setDraft(next); setPage(1) }}>Task Type: {filters.task_type} <BsX /></button>}{filters.date_preset && <button onClick={() => { const next = { ...filters, date_preset: '', date_from: '', date_to: '' }; setFilters(next); setDraft(next); setPage(1) }}>Feedback Date: {({ today: 'Today', week: 'This Week', month: 'This Month', last30: 'Last 30 Days', last90: 'Last 90 Days', custom: 'Custom Range' } as Record<string, string>)[filters.date_preset]} <BsX /></button>}<button className="clear-filter-chip" onClick={clear}>Clear All</button></div>}
    <div className="report-summary" aria-label="Feedback status summary">
      <div className="completed"><StatusIcon value="Completed" /><span>Completed<strong>{totalSubmitted}</strong></span></div><div className="pending"><StatusIcon value="Pending" /><span>Pending<strong>0</strong></span></div><div className="assigned"><StatusIcon value="Assigned" /><span>Assigned<strong>0</strong></span></div><div className="review"><StatusIcon value="Pending Review" /><span>Pending Review<strong>0</strong></span></div><div className="cancelled"><StatusIcon value="Cancelled" /><span>Cancelled<strong>0</strong></span></div>
    </div>
    <div className="status-legend" tabIndex={0}><BsInfoCircle /> Status icons<div className="status-legend-popover"><span><StatusIcon value="Completed" /> Completed</span><span><StatusIcon value="Pending" /> Pending</span><span><StatusIcon value="Assigned" /> Assigned</span><span><StatusIcon value="Pending Review" /> Pending Review</span><span><StatusIcon value="Cancelled" /> Cancelled</span></div></div>
    {(['week', 'month', 'earlier'] as GroupKey[]).map(key => { const info = groupInfo[key]; const totalPages = Math.max(1, Math.ceil(totals.earlier / limit)); const numbered = pagesToShow(page, totalPages); return <section className={`feedback-group group-${key}`} key={key}><button className="feedback-group-header" onClick={() => setExpanded(current => ({ ...current, [key]: !current[key] }))} aria-expanded={expanded[key]}>{expanded[key] ? <BsChevronDown /> : <BsChevronRight />}<span><strong>{info.title}</strong><small>{info.subtitle}</small></span><em>{totals[key]} Feedback{totals[key] === 1 ? '' : 's'}</em></button>{expanded[key] && <><SubmittedTable rows={groups[key]} loading={loading} empty={info.empty} filtered={activeCount > 0 || Boolean(filters.search)} onView={setSelected} />{key === 'earlier' && <footer className="feedback-pagination"><span>Showing {totals.earlier ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, totals.earlier)} of {totals.earlier} records</span><label>Rows per page <select value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1) }}>{[10, 50, 100, 200, 500].map(size => <option key={size}>{size}</option>)}</select></label><nav aria-label="Previous feedback pages"><button disabled={page === 1} onClick={() => setPage(1)} aria-label="First page"><BsChevronBarLeft /></button><button disabled={page === 1} onClick={() => setPage(value => value - 1)} aria-label="Previous page"><BsChevronLeft /></button>{numbered.map((number, index) => <span key={number}>{index > 0 && number - numbered[index - 1] > 1 && <i>…</i>}<button className={number === page ? 'current' : ''} onClick={() => setPage(number)} aria-current={number === page ? 'page' : undefined}>{number}</button></span>)}<button disabled={page === totalPages} onClick={() => setPage(value => value + 1)} aria-label="Next page"><BsChevronRight /></button><button disabled={page === totalPages} onClick={() => setPage(totalPages)} aria-label="Last page"><BsChevronBarRight /></button></nav></footer>}</>}</section> })}
  </main><FeedbackModal open={selected !== null} mode="VIEW" taskId={selected?.id ?? null} taskType={String(selected?.task_type ?? '')} onClose={() => setSelected(null)} onSubmitted={() => undefined} /></PageContainer>
}

const GeneralFeedbackReport = () => {
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(false); const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [selected, setSelected] = useState<Row | null>(null)
  useEffect(() => { const load = async () => { setLoading(true); try { setRows(await getAllFeedback()) } finally { setLoading(false) } }; void load() }, [])
  const filtered = useMemo(() => rows.filter(row => String(row.candidate_name ?? '').toLowerCase().includes(query.toLowerCase()) || String(row.company_name ?? '').toLowerCase().includes(query.toLowerCase())), [rows, query]); const paginated = filtered.slice((page - 1) * 10, page * 10); const totalPages = Math.max(1, Math.ceil(filtered.length / 10))
  return <PageContainer title="Feedback Report" description="All submitted feedback data across tasks."><div className="card shadow-sm"><div className="card-body"><input className="form-control mb-3" placeholder="Filter by candidate/company" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} /><div className="table-responsive"><table className="table table-bordered table-hover table-sm align-middle"><thead className="table-light"><tr><th>Task</th><th>Date</th><th>Candidate</th><th>Task Type</th><th>Company</th><th>Interviewer</th><th>Overall</th><th>Assigned To</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={10}>Loading...</td></tr> : paginated.length === 0 ? <tr><td colSpan={10} className="text-center text-muted">No feedback data.</td></tr> : paginated.map(row => <tr key={String(row.id ?? row.task_id)}><td>{String(row.task_id ?? '—')}</td><td>{String(row.due_date ?? '—')}</td><td>{String(row.candidate_name ?? '—')}</td><td>{String(row.task_type ?? '—')}</td><td>{String(row.company_name ?? '—')}</td><td>{String(row.interviewer_name ?? '—')}</td><td>{String(row.overall ?? '—')}</td><td>{String(row.assigned_to_name ?? '—')}</td><td>{String(row.task_status ?? '—')}</td><td><button className="btn btn-sm btn-outline-primary" onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody></table></div><div className="d-flex justify-content-end gap-2"><button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div></div><FeedbackModal open={selected !== null} mode="VIEW" taskId={selected ? Number(selected.task_id) : null} taskType={String(selected?.task_type ?? '')} onClose={() => setSelected(null)} onSubmitted={() => undefined} /></PageContainer>
}

const FeedbackReportPage = () => { const { user } = useAuth(); const role = String(user?.role ?? '').toLowerCase(); return ['expert', 'technical expert', 'expertlead', 'technical lead'].includes(role) ? <ExpertFeedbackReport /> : <GeneralFeedbackReport /> }
export default FeedbackReportPage
