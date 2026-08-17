import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BsChatSquareText, BsChevronDown, BsChevronRight, BsEye, BsFunnel, BsSearch, BsX, BsArrowClockwise } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import ExpertWorkspaceHeader from '../../../shared/components/ExpertWorkspaceHeader'
import FeedbackModal from '../components/FeedbackModal'
// @ts-ignore legacy service is intentionally shared with the existing feedback workflow
import { loadTaskForFeedback } from '../services/expertTaskReportsService'
import { useAuth } from '../../../context/AuthContext'
import { formatEastern, formatIST } from '../../../utils/timezone'
import './expertTaskReports.css'

type GroupKey = 'pending' | 'week' | 'month' | 'earlier'
type Row = Record<string, any> & { id: number; has_feedback: boolean }
type Filters = { search: string; candidate_name: string; task_type: string; feedback_status: string; date_preset: string; date_from: string; date_to: string }
const emptyFilters: Filters = { search: '', candidate_name: '', task_type: '', feedback_status: '', date_preset: '', date_from: '', date_to: '' }
const groupInfo: Record<GroupKey, { title: string; subtitle: string; empty: string }> = {
  pending: { title: 'Pending Feedback', subtitle: 'Tasks requiring your feedback', empty: "No feedback pending. You're all caught up." },
  week: { title: 'Completed This Week', subtitle: 'Feedback submitted this week', empty: 'No feedback submitted this week.' },
  month: { title: 'Completed This Month', subtitle: 'Feedback submitted this month', empty: 'No additional feedback submitted this month.' },
  earlier: { title: 'Earlier in Last 30 Days', subtitle: 'Earlier feedback from the last 30 days', empty: 'No earlier feedback found in the last 30 days.' },
}

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getThirtyDayBounds = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const earliest = new Date(today)
  earliest.setDate(earliest.getDate() - 29)
  return { earliest: formatLocalDate(earliest), today: formatLocalDate(today) }
}

const normalizeRow = (row: any): Row => ({ ...row, id: Number(row.task_id ?? row.id), start_time: row.ist_start_time ?? row.start_time, end_time: row.ist_end_time ?? row.end_time, has_feedback: String(row.feedback_status || '').toLowerCase() === 'submitted' })
const toDate = (date?: string, time?: string) => {
  if (!date || !time) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const parts = String(time).slice(0, 8).split(':').map(Number)
  if (!match || parts.length < 2) return null
  return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], parts[0] - 5, parts[1] - 30, parts[2] || 0))
}

const FeedbackTable = ({ rows, loading, pending, empty, onAction }: { rows: Row[]; loading: boolean; pending: boolean; empty: string; onAction: (row: Row) => void }) => (
  <div className="feedback-table-wrap">
    <table className="feedback-table">
      <thead><tr><th>Action</th><th>Task date</th><th>Candidate name</th><th>Task type</th><th>Status</th><th>IST time</th><th>ET time</th><th>{pending ? 'Feedback status' : 'Submitted date'}</th></tr></thead>
      <tbody>
        {loading ? <tr><td colSpan={8} className="feedback-empty"><span className="spinner-border spinner-border-sm text-primary" /> Loading feedback…</td></tr> : rows.length === 0 ? <tr><td colSpan={8} className="feedback-empty">{empty}</td></tr> : rows.map(row => {
          const start = toDate(row.task_date, row.start_time); const end = toDate(row.task_date, row.end_time)
          return <tr key={row.id}>
            <td><button className={`feedback-action ${pending ? 'provide' : 'view'}`} onClick={() => onAction(row)} title={pending ? 'Provide Feedback' : 'View Feedback'} aria-label={pending ? 'Provide Feedback' : 'View Feedback'}>{pending ? <BsChatSquareText /> : <BsEye />}</button></td>
            <td>{row.task_date || '—'}</td><td className="feedback-person">{row.candidate_name || '—'}</td><td>{row.task_type || '—'}</td>
            <td><span className={`feedback-badge status-${String(row.status_name).toLowerCase().replaceAll(' ', '-')}`}>{row.status_name || '—'}</span></td>
            <td>{start ? `${formatIST(start)}${end ? ` – ${formatIST(end)}` : ''}` : '—'}</td><td>{start ? `${formatEastern(start)}${end ? ` – ${formatEastern(end)}` : ''}` : '—'}</td>
            <td>{pending ? <span className="feedback-badge pending">Pending Feedback</span> : (row.feedback_submitted_at || 'Submitted')}</td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
)

const pagesToShow = (page: number, total: number) => Array.from(new Set([1, total, page - 1, page, page + 1].filter(n => n > 0 && n <= total))).sort((a, b) => a - b)

const ExpertTaskReportsPage = () => {
  const { user } = useAuth(); const expertId = Number((user as any)?.expert_id ?? (user as any)?.user_id ?? user?.id ?? 0)
  const [draft, setDraft] = useState<Filters>(emptyFilters); const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [groups, setGroups] = useState<Record<GroupKey, Row[]>>({ pending: [], week: [], month: [], earlier: [] })
  const [totals, setTotals] = useState<Record<GroupKey, number>>({ pending: 0, week: 0, month: 0, earlier: 0 })
  const [open, setOpen] = useState<Record<GroupKey, boolean>>({ pending: true, week: true, month: true, earlier: true })
  const [filterOpen, setFilterOpen] = useState(false); const panelRef = useRef<HTMLDivElement>(null); const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(10); const [modal, setModal] = useState<{ id: number; type: string; mode: 'ADD' | 'VIEW' } | null>(null)
  const activeCount = Object.values(filters).filter(Boolean).length
  const dates = useMemo(() => {
    const now = new Date()
    const bounds = getThirtyDayBounds()
    let from = filters.date_from
    let to = filters.date_to
    if (filters.date_preset === 'today') from = to = bounds.today
    if (filters.date_preset === 'week') {
      const start = new Date(now)
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
      from = formatLocalDate(start); to = bounds.today
    }
    if (filters.date_preset === 'month') { from = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)); to = bounds.today }
    if (filters.date_preset === 'last30') { from = bounds.earliest; to = bounds.today }
    if (filters.date_preset === 'custom') {
      from = !from || from < bounds.earliest ? bounds.earliest : from
      to = !to || to > bounds.today ? bounds.today : to
    }
    return { from, to }
  }, [filters])
  const fetchRows = useCallback(async () => {
    if (!expertId) return; setLoading(true)
    try {
      const common = { user_id: expertId, expert_id: expertId, search: filters.search, candidate_name: filters.candidate_name, task_type: filters.task_type, feedback_status: filters.feedback_status, date_from: dates.from, date_to: dates.to }
      const keys: GroupKey[] = ['pending', 'week', 'month', 'earlier']
      const results = await Promise.all(keys.map(group => loadTaskForFeedback({ ...common, feedback_group: group, page: group === 'earlier' ? page : 1, limit: group === 'earlier' ? limit : 500 })))
      const nextGroups = {} as Record<GroupKey, Row[]>; const nextTotals = {} as Record<GroupKey, number>
      keys.forEach((key, i) => { nextGroups[key] = (results[i].items || []).map(normalizeRow); nextTotals[key] = Number(results[i].pagination?.total_records || 0) })
      setGroups(nextGroups); setTotals(nextTotals)
    } finally { setLoading(false) }
  }, [expertId, filters, dates.from, dates.to, page, limit])
  useEffect(() => { void fetchRows() }, [fetchRows])
  useEffect(() => { const close = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setFilterOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])
  const options = useMemo(() => ({ candidates: [...new Set(Object.values(groups).flat().map(r => String(r.candidate_name || '')).filter(Boolean))].sort(), types: [...new Set(Object.values(groups).flat().map(r => String(r.task_type || '')).filter(Boolean))].sort() }), [groups])
  const action = (row: Row, mode: 'ADD' | 'VIEW') => setModal({ id: row.id, type: String(row.task_type || ''), mode })
  return <PageContainer><ExpertWorkspaceHeader title="Task Feedback" />
    <main className="feedback-workspace">
      <div className="feedback-toolbar">
        <label className="feedback-search"><BsSearch /><input value={draft.search} placeholder="Search candidate, task, expert…" onChange={e => setDraft(p => ({ ...p, search: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setFilters(draft) } }} /></label>
        <div className="feedback-filter-anchor" ref={panelRef}><button className={`toolbar-button ${activeCount ? 'active' : ''}`} onClick={() => setFilterOpen(v => !v)}><BsFunnel /> Filter {activeCount > 0 && <b>{activeCount}</b>}</button>
          {filterOpen && <div className="quick-filter-panel"><div className="quick-filter-heading"><div><strong>Quick Filters</strong><small>Filter feedback records</small></div><button onClick={() => setFilterOpen(false)} aria-label="Close"><BsX /></button></div>
            <div className="quick-filter-grid"><label>Candidate<select value={draft.candidate_name} onChange={e => setDraft(p => ({ ...p, candidate_name: e.target.value }))}><option value="">All candidates</option>{options.candidates.map(v => <option key={v}>{v}</option>)}</select></label><label>Task Type<select value={draft.task_type} onChange={e => setDraft(p => ({ ...p, task_type: e.target.value }))}><option value="">All task types</option>{options.types.map(v => <option key={v}>{v}</option>)}</select></label><label>Feedback Status<select value={draft.feedback_status} onChange={e => setDraft(p => ({ ...p, feedback_status: e.target.value }))}><option value="">All feedback</option><option value="pending">Pending Feedback</option><option value="submitted">Submitted</option></select></label><label>Date<select value={draft.date_preset} onChange={e => setDraft(p => ({ ...p, date_preset: e.target.value }))}><option value="">Any date</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="last30">Last 30 Days</option><option value="custom">Custom Range</option></select></label></div>
            {draft.date_preset === 'custom' && <div className="custom-dates"><label>Date From<input type="date" min={getThirtyDayBounds().earliest} max={getThirtyDayBounds().today} value={draft.date_from} onChange={e => setDraft(p => ({ ...p, date_from: e.target.value }))} /></label><label>Date To<input type="date" min={getThirtyDayBounds().earliest} max={getThirtyDayBounds().today} value={draft.date_to} onChange={e => setDraft(p => ({ ...p, date_to: e.target.value }))} /></label><small>Custom ranges are limited to the last 30 calendar days.</small></div>}
            <div className="quick-filter-footer"><button onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1) }}>Clear All</button><button className="apply" onClick={() => { setFilters(draft); setPage(1); setFilterOpen(false) }}>Apply Filters</button></div></div>}
        </div><button className="toolbar-button refresh" onClick={() => void fetchRows()} disabled={loading}><BsArrowClockwise /> Refresh</button>
      </div>
      {activeCount > 0 && <div className="active-filter-chips">{filters.task_type && <button onClick={() => { const n = { ...filters, task_type: '' }; setFilters(n); setDraft(n) }}>{filters.task_type} <BsX /></button>}{filters.feedback_status && <button onClick={() => { const n = { ...filters, feedback_status: '' }; setFilters(n); setDraft(n) }}>{filters.feedback_status === 'pending' ? 'Pending Feedback' : 'Submitted'} <BsX /></button>}</div>}
      {(Object.keys(groupInfo) as GroupKey[]).map(key => { const info = groupInfo[key]; const totalPages = Math.max(1, Math.ceil(totals.earlier / limit)); const numbered = pagesToShow(page, totalPages); return <section key={key} className={`feedback-group group-${key}`}><button className="feedback-group-header" onClick={() => setOpen(p => ({ ...p, [key]: !p[key] }))}>{open[key] ? <BsChevronDown /> : <BsChevronRight />}<span><strong>{info.title}</strong><small>{info.subtitle}</small></span><em>{totals[key]} {key === 'pending' ? 'Pending' : 'Feedback'}</em></button>{open[key] && <><FeedbackTable rows={groups[key]} loading={loading} pending={key === 'pending'} empty={info.empty} onAction={r => action(r, key === 'pending' ? 'ADD' : 'VIEW')} />{key === 'earlier' && <footer className="feedback-pagination"><span>Showing {totals.earlier ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, totals.earlier)} of {totals.earlier} feedback records</span><label>Rows per page <select value={limit} onChange={e => { setLimit(+e.target.value); setPage(1) }}>{[10, 50, 100, 200, 500].map(n => <option key={n}>{n}</option>)}</select></label><nav><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>{numbered.map((n, i) => <span key={n}>{i > 0 && n - numbered[i - 1] > 1 && <i>…</i>}<button className={n === page ? 'current' : ''} onClick={() => setPage(n)}>{n}</button></span>)}<button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button></nav></footer>}</>}</section> })}
    </main><FeedbackModal open={modal !== null} mode={modal?.mode || 'ADD'} taskId={modal?.id || null} taskType={modal?.type || ''} onClose={() => setModal(null)} onSubmitted={() => { setModal(null); void fetchRows() }} /></PageContainer>
}
export default ExpertTaskReportsPage
