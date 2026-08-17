import { useEffect, useMemo, useState } from 'react'
import { BsArrowClockwise, BsBoxArrowUpRight, BsCalendar3, BsChevronDown, BsDownload, BsInfoCircle, BsSearch, BsSliders } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import TaskDetailsModal from '../../../shared/components/TaskDetailsModal'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'
import './CandidateReportPage.css'

const PAGE_SIZES = [10, 50, 100, 200, 500]
const dash = '—'

type TaskTypeSummary = {
  name: string
  tasks: ExpertTaskItem[]
  count: number
  averageRating: number | null
  successApplicable: boolean
  successRate: number | null
}

type CandidateSummary = {
  name: string
  tasks: ExpertTaskItem[]
  counts: Record<string, number>
  averageRating: number | null
  successRate: number | null
}

const ratingAverage = (tasks: ExpertTaskItem[]) => {
  const ratings = tasks.map((task) => Number(task.feedback_overall)).filter((rating) => rating > 0)
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null
}

const isInterviewType = (name: string) => /interview|\bmock\b/i.test(name)

const outcomeRate = (tasks: ExpertTaskItem[]) => {
  const outcomes = tasks.filter((task) => /success|reject/i.test(task.status_name))
  if (!outcomes.length) return null
  return outcomes.filter((task) => /success/i.test(task.status_name)).length / outcomes.length * 100
}

const formatRating = (rating: number | null) => rating === null ? dash : rating.toFixed(2)
const formatSuccess = (rate: number | null) => rate === null ? dash : `${rate.toFixed(1)}%`
const formatDate = (value: string) => {
  if (!value) return dash
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const pageNumbers = (current: number, total: number) => {
  const start = Math.max(1, Math.min(current - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, index) => Math.max(1, start) + index)
}

const Pagination = ({ page, total, pageSize, noun, onPage, onPageSize }: { page: number; total: number; pageSize: number; noun: string; onPage: (page: number) => void; onPageSize: (size: number) => void }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total ? (page - 1) * pageSize + 1 : 0
  const last = Math.min(page * pageSize, total)
  return (
    <div className="candidate-report__pagination">
      <span>Showing {first}–{last} of {total} {noun}</span>
      <label>Rows per page
        <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select>
      </label>
      <nav aria-label={`${noun} pagination`}>
        <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        {pageNumbers(page, pages).map((number) => <button type="button" className={number === page ? 'active' : ''} key={number} onClick={() => onPage(number)}>{number}</button>)}
        <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>›</button>
      </nav>
    </div>
  )
}

const CandidateReportPage = () => {
  const [rows, setRows] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draftSearch, setDraftSearch] = useState('')
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [filters, setFilters] = useState({ search: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedType, setSelectedType] = useState<TaskTypeSummary | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSummary | null>(null)
  const [modalPage, setModalPage] = useState(1)
  const [modalPageSize, setModalPageSize] = useState(10)
  const [detailTask, setDetailTask] = useState<ExpertTaskItem | null>(null)

  const load = async () => {
    setLoading(true); setError(false)
    try { setRows(await getExpertTasks()) } catch { setError(true) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => rows.filter((task) => {
    const date = task.due_date.slice(0, 10)
    return task.candidate_name.toLowerCase().includes(filters.search.toLowerCase()) && (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to)
  }), [rows, filters])

  const taskTypes = useMemo<TaskTypeSummary[]>(() => {
    const groups = new Map<string, ExpertTaskItem[]>()
    filtered.forEach((task) => {
      const name = task.task_type || task.support_type || 'Other Support'
      groups.set(name, [...(groups.get(name) ?? []), task])
    })
    return Array.from(groups, ([name, tasks]) => ({ name, tasks, count: tasks.length, averageRating: ratingAverage(tasks), successApplicable: isInterviewType(name), successRate: isInterviewType(name) ? outcomeRate(tasks) : null })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [filtered])

  const candidates = useMemo<CandidateSummary[]>(() => {
    const groups = new Map<string, ExpertTaskItem[]>()
    filtered.forEach((task) => { const name = task.candidate_name || 'Unknown Candidate'; groups.set(name, [...(groups.get(name) ?? []), task]) })
    return Array.from(groups, ([name, tasks]) => {
      const counts: Record<string, number> = {}
      tasks.forEach((task) => { const type = task.task_type || task.support_type || 'Other Support'; counts[type] = (counts[type] ?? 0) + 1 })
      const interviewTasks = tasks.filter((task) => isInterviewType(task.task_type || task.support_type))
      return { name, tasks, counts, averageRating: ratingAverage(tasks), successRate: outcomeRate(interviewTasks) }
    }).sort((a, b) => b.tasks.length - a.tasks.length || a.name.localeCompare(b.name))
  }, [filtered])

  useEffect(() => { setPage(1) }, [filters, pageSize])
  const shownCandidates = candidates.slice((page - 1) * pageSize, page * pageSize)
  const modalTasks = selectedType?.tasks ?? selectedCandidate?.tasks ?? []
  const shownModalTasks = modalTasks.slice((modalPage - 1) * modalPageSize, modalPage * modalPageSize)

  const apply = () => setFilters({ search: draftSearch.trim(), from: draftFrom, to: draftTo })
  const reset = () => { setDraftSearch(''); setDraftFrom(''); setDraftTo(''); setFilters({ search: '', from: '', to: '' }) }
  const openType = (type: TaskTypeSummary) => { setSelectedType(type); setSelectedCandidate(null); setModalPage(1) }
  const openCandidate = (candidate: CandidateSummary) => { setSelectedCandidate(candidate); setSelectedType(null); setModalPage(1) }
  const exportCsv = () => {
    const header = ['Candidate', 'Total Tasks', ...taskTypes.map((type) => type.name), 'Average Rating']
    const csv = [header, ...candidates.map((candidate) => [candidate.name, candidate.tasks.length, ...taskTypes.map((type) => candidate.counts[type.name] ?? 0), formatRating(candidate.averageRating)])]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'candidate-report.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  const taskDetail = detailTask ? { taskId: detailTask.task_id, title: detailTask.title || detailTask.task_type, status: detailTask.status_name, candidateName: detailTask.candidate_name, companyName: detailTask.company_name, supportType: detailTask.task_type, assignedTo: detailTask.assigned_to_name, assignedBy: detailTask.assigned_by_name, dueDate: detailTask.due_date, startTime: detailTask.start_time, endTime: detailTask.end_time, description: detailTask.description } : null

  return (
    <PageContainer className="candidate-report" title="Candidate Report" description="Summary of support task performance by task type." actions={<div className="candidate-report__date"><BsCalendar3 /><span><small>Report Date</small>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>}>
      <section className="candidate-report__surface">
        <div className="candidate-report__filters">
          <label className="candidate-report__search"><BsSearch /><input aria-label="Search candidate" placeholder="Search by candidate name..." value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') apply() }} /></label>
          <label><span>From Date</span><input aria-label="From Date" type="date" value={draftFrom} max={draftTo || undefined} onChange={(event) => setDraftFrom(event.target.value)} /></label>
          <label><span>To Date</span><input aria-label="To Date" type="date" value={draftTo} min={draftFrom || undefined} onChange={(event) => setDraftTo(event.target.value)} /></label>
          <button className="candidate-report__primary" type="button" onClick={apply}><BsSliders /> Apply Filter</button>
          <button type="button" onClick={reset}><BsArrowClockwise /> Reset</button>
          <button type="button" onClick={exportCsv}><BsDownload /> Export <BsChevronDown /></button>
        </div>
        {(filters.search || filters.from || filters.to) && <div className="candidate-report__chips">
          {filters.search && <span>Candidate: <strong>{filters.search}</strong> <button aria-label="Clear candidate filter" onClick={() => { setDraftSearch(''); setFilters((value) => ({ ...value, search: '' })) }}>×</button></span>}
          {(filters.from || filters.to) && <span>Date Range: <strong>{filters.from ? formatDate(filters.from) : 'Any'} – {filters.to ? formatDate(filters.to) : 'Any'}</strong> <button aria-label="Clear date filter" onClick={() => { setDraftFrom(''); setDraftTo(''); setFilters((value) => ({ ...value, from: '', to: '' })) }}>×</button></span>}
          <button type="button" className="candidate-report__clear" onClick={reset}>Clear All</button>
        </div>}

        {error ? <div className="candidate-report__error"><strong>Unable to load Candidate Report.</strong><button type="button" onClick={() => void load()}>Retry</button></div> : <>
          <h3>Performance by Task Type</h3>
          {loading ? <div className="candidate-report__grid">{Array.from({ length: 8 }, (_, index) => <div className="candidate-report__card skeleton" key={index} />)}</div> : taskTypes.length ? <div className="candidate-report__grid">{taskTypes.map((type) => <article className="candidate-report__card" key={type.name}>
            <div className="candidate-report__card-title"><span>{type.name.slice(0, 1).toUpperCase()}</span><strong>{type.name}</strong></div>
            <div className="candidate-report__metrics"><div><strong>{type.count}</strong><small>Tasks</small></div>{type.successApplicable && <div><small>Interview Success</small><strong className="success">{formatSuccess(type.successRate)}</strong></div>}<div><small>Avg. Rating</small><strong>{formatRating(type.averageRating)}</strong></div></div>
            <button type="button" onClick={() => openType(type)}>View More <span>→</span></button>
          </article>)}</div> : <div className="candidate-report__empty">No task performance data found for the selected filters.</div>}
          <p className="candidate-report__note"><BsInfoCircle /> Interview Success is calculated only for task types that have an applicable interview outcome.</p>

          <div className="candidate-report__summary-heading"><h3>Candidate Performance Summary</h3></div>
          <div className="candidate-report__table-wrap"><table><thead><tr><th>#</th><th>Candidate</th><th>Total Tasks</th>{taskTypes.map((type) => <th key={type.name}>{type.name}</th>)}<th>Avg. Rating</th><th>View</th></tr></thead>
            <tbody>{loading ? Array.from({ length: 5 }, (_, index) => <tr className="skeleton-row" key={index}><td colSpan={taskTypes.length + 5} /></tr>) : shownCandidates.length ? shownCandidates.map((candidate, index) => <tr key={candidate.name}><td>{(page - 1) * pageSize + index + 1}</td><td><strong>{candidate.name}</strong></td><td>{candidate.tasks.length}</td>{taskTypes.map((type) => <td key={type.name}>{candidate.counts[type.name] ?? 0}</td>)}<td>{formatRating(candidate.averageRating)}</td><td><button type="button" onClick={() => openCandidate(candidate)}>View</button></td></tr>) : <tr><td colSpan={taskTypes.length + 5}>No candidate performance data found for the selected filters.</td></tr>}</tbody></table></div>
          {!loading && <Pagination page={page} total={candidates.length} pageSize={pageSize} noun="candidates" onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1) }} />}
        </>}
      </section>

      <AnimatedModal isOpen={Boolean(selectedType || selectedCandidate)} title={selectedType ? `${selectedType.name} — Task Details` : 'Candidate Performance Details'} onClose={() => { setSelectedType(null); setSelectedCandidate(null) }} size="xl" cardClassName="candidate-report__modal">
        <div className="candidate-report__modal-header"><div><h2>{selectedType ? `${selectedType.name} — Task Details` : selectedCandidate?.name}</h2>{selectedCandidate && <p>Candidate Performance Details</p>}</div><button aria-label="Close" onClick={() => { setSelectedType(null); setSelectedCandidate(null) }}>×</button></div>
        <div className="candidate-report__modal-body">
          <div className="candidate-report__modal-stats"><div><small>Total Tasks</small><strong>{modalTasks.length}</strong></div><div><small>Average Rating</small><strong>{formatRating(ratingAverage(modalTasks))}</strong></div>{(selectedType?.successApplicable || selectedCandidate) && <div><small>Interview Success</small><strong>{formatSuccess(selectedType ? selectedType.successRate : selectedCandidate?.successRate ?? null)}</strong></div>}</div>
          {selectedCandidate && <div className="candidate-report__breakdown"><h3>Task Breakdown</h3>{Object.entries(selectedCandidate.counts).map(([name, count]) => <span key={name}><span>{name}</span><strong>{count}</strong></span>)}</div>}
          <h3>Task History</h3><div className="candidate-report__table-wrap"><table><thead><tr><th>Task ID</th><th>Date</th>{selectedType && <th>Candidate</th>}<th>Task Type</th><th>Rating</th><th>Result</th><th>Action</th></tr></thead><tbody>{shownModalTasks.length ? shownModalTasks.map((task) => <tr key={task.task_id}><td>TAS-{task.task_id}</td><td>{formatDate(task.due_date)}</td>{selectedType && <td>{task.candidate_name || dash}</td>}<td>{task.task_type || dash}</td><td>{task.feedback_overall > 0 ? Number(task.feedback_overall).toFixed(2) : dash}</td><td>{isInterviewType(task.task_type) && /success|reject/i.test(task.status_name) ? task.status_name : dash}</td><td><button type="button" onClick={() => setDetailTask(task)}>View <BsBoxArrowUpRight /></button></td></tr>) : <tr><td colSpan={selectedType ? 7 : 6}>No tasks found.</td></tr>}</tbody></table></div>
          <Pagination page={modalPage} total={modalTasks.length} pageSize={modalPageSize} noun="tasks" onPage={setModalPage} onPageSize={(size) => { setModalPageSize(size); setModalPage(1) }} />
        </div>
      </AnimatedModal>
      <TaskDetailsModal isOpen={Boolean(detailTask)} role="expert" task={taskDetail} onClose={() => setDetailTask(null)} />
    </PageContainer>
  )
}

export default CandidateReportPage
