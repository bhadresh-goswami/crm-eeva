import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'
import { BsArrowDownUp, BsDownload, BsEye, BsPencilFill } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import ManagerWorkspaceHeader from '../../../shared/components/ManagerWorkspaceHeader'
import { useAuth } from '../../../context/AuthContext'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import { getBulkPriceTasks, type BulkPriceTaskRecord } from '../api/tasksApi'
import './bulkPrice.css'
import './pendingPaymentsReport.css'

const pageSizes = [10, 25, 50, 100]
type SortKey = 'due_date' | 'company_name' | 'candidate_name' | 'pending_amount' | 'status' | 'duration'
type SortState = { key: SortKey; direction: 'asc' | 'desc' }
type ReportRow = BulkPriceTaskRecord & { duration: string }

const formatDate = (value: string) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const formatCurrency = (value: number) => `₹${Number(value || 0).toFixed(2)}`
const csvEscape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

const getDuration = (task: BulkPriceTaskRecord) => {
  const start = timeToMinutes(task.start_time)
  const end = timeToMinutes(task.end_time)
  if (start === null || end === null) return '—'
  const minutes = Math.max(end - start, 0)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`
}

const PendingPaymentsReport = () => {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientItem[]>([])
  const [tasks, setTasks] = useState<BulkPriceTaskRecord[]>([])
  const [summary, setSummary] = useState({ total_pending_tasks: 0, total_pending_amount: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [clientId, setClientId] = useState('')
  const [candidate, setCandidate] = useState('all')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<SortState>({ key: 'due_date', direction: 'desc' })

  const loadReport = async (filters?: { fromDate?: string; toDate?: string; clientId?: string; search?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getBulkPriceTasks({
        from_date: (filters?.fromDate ?? fromDate) || undefined,
        to_date: (filters?.toDate ?? toDate) || undefined,
        client_id: Number(filters?.clientId ?? clientId) || undefined,
        search: (filters?.search ?? search).trim() || undefined,
      })
      setTasks(response.tasks)
      setSummary(response.summary)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load pending payments report.')
      setTasks([])
      setSummary({ total_pending_tasks: 0, total_pending_amount: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadClients = async () => {
      try {
        setClients(await getClients())
      } catch {
        setClients([])
      }
    }
    void loadClients()
    void loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => setPage(1), [search, clientId, candidate, status, fromDate, toDate, pageSize])

  const candidateOptions = useMemo(() => Array.from(new Set(tasks.map((task) => task.candidate_name).filter(Boolean))).sort(), [tasks])
  const statusOptions = useMemo(() => Array.from(new Set(tasks.map((task) => task.status).filter(Boolean))).sort(), [tasks])

  const rows = useMemo<ReportRow[]>(() => tasks.map((task) => ({ ...task, duration: getDuration(task) })), [tasks])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (candidate !== 'all' && row.candidate_name !== candidate) return false
      if (status !== 'all' && row.status !== status) return false
      if (!normalizedSearch) return true
      return [row.company_name, row.candidate_name, row.status, row.support_type].some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [candidate, rows, search, status])

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1
    const aValue = sort.key === 'pending_amount' ? a.pending_amount : a[sort.key]
    const bValue = sort.key === 'pending_amount' ? b.pending_amount : b[sort.key]
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction
    return String(aValue).localeCompare(String(bValue)) * direction
  }), [filteredRows, sort])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: SortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))

  const onReset = () => {
    setSearch(''); setClientId(''); setCandidate('all'); setStatus('all'); setFromDate(''); setToDate('')
    void loadReport({ fromDate: '', toDate: '', clientId: '', search: '' })
  }

  const exportRows = (extension: 'csv' | 'xls') => {
    const headers = ['Date', 'Client', 'Candidate', 'Amount', 'Status', 'Duration']
    const body = sortedRows.map((row) => [formatDate(row.due_date || row.created_at), row.company_name || '—', row.candidate_name || '—', row.pending_amount, row.status || '—', row.duration])
    const csv = [headers, ...body].map((line) => line.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pending-payments-report.${extension}`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <PageContainer title={user?.role === 'manager' ? undefined : "Pending Payments Report"} description={user?.role === 'manager' ? undefined : "Track unpaid invoices and pending collections."}>
      {user?.role === 'manager' ? <ManagerWorkspaceHeader title="Business insights and operational analytics." subtitle="Analyze workload, productivity, task trends, and performance metrics." /> : null}
      <section className="pending-payments-report__summary" aria-label="Pending payments summary">
        <article className="pending-payments-report__metric" style={{ '--metric-accent': '#f59e0b' } as CSSProperties}>
          <p className="pending-payments-report__metric-label">Pending Payments</p>
          <p className="pending-payments-report__metric-value">{summary.total_pending_tasks}</p>
          <p className="pending-payments-report__metric-helper">Total unpaid records</p>
        </article>
        <article className="pending-payments-report__metric" style={{ '--metric-accent': '#10b981' } as CSSProperties}>
          <p className="pending-payments-report__metric-label">Pending Amount</p>
          <p className="pending-payments-report__metric-value">{formatCurrency(summary.total_pending_amount)}</p>
          <p className="pending-payments-report__metric-helper">Outstanding collections</p>
        </article>
        <article className="pending-payments-report__metric" style={{ '--metric-accent': '#3b82f6' } as CSSProperties}>
          <p className="pending-payments-report__metric-label">Visible Results</p>
          <p className="pending-payments-report__metric-value">{sortedRows.length}</p>
          <p className="pending-payments-report__metric-helper">After search and filters</p>
        </article>
      </section>

      <section className="filter-card pending-payments-report__filter-card mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-3"><label className="form-label">Search</label><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client / candidate / status" /></div>
          <div className="col-12 col-md-3"><label className="form-label">Client</label><select className="form-select" value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">All Clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name || client.name}</option>)}</select></div>
          <div className="col-12 col-md-3"><label className="form-label">Candidate</label><select className="form-select" value={candidate} onChange={(event) => setCandidate(event.target.value)}><option value="all">All Candidates</option>{candidateOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
          <div className="col-12 col-md-3"><label className="form-label">Status</label><select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All Statuses</option>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="col-6 col-md-2"><label className="form-label">From</label><input className="form-control" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></div>
          <div className="col-6 col-md-2"><label className="form-label">To</label><input className="form-control" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></div>
          <div className="col-12 col-md-3 d-flex gap-2"><button className="btn btn-outline-secondary w-100" type="button" onClick={onReset}>Reset</button><button className="btn btn-primary w-100" type="button" onClick={() => void loadReport()} disabled={loading}>{loading ? 'Loading...' : 'Apply'}</button></div>
        </div>
      </section>

      {error ? <p className="dashboard-notice">{error}</p> : null}

      <section className="table-card pending-payments-report__table-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pending-payments-report__toolbar">
          <div className="d-flex align-items-center gap-2"><small className="text-muted">Rows:</small><select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(event) => setPageSize(Number(event.target.value))}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></div>
          <div className="d-flex gap-2"><button className="btn btn-success btn-sm" type="button" onClick={() => exportRows('csv')}><BsDownload className="me-1" />Export CSV</button><button className="btn btn-success btn-sm" type="button" onClick={() => exportRows('xls')}><BsDownload className="me-1" />Export Excel</button></div>
        </div>
        <div className="table-wrapper manager-reports-table__wrapper pending-payments-report__table-wrapper">
          <table className="table table-hover align-middle manager-reports-table pending-payments-report__table mb-0">
            <thead><tr>{[['due_date', 'Date'], ['company_name', 'Client'], ['candidate_name', 'Candidate'], ['pending_amount', 'Amount'], ['status', 'Status'], ['duration', 'Duration']].map(([key, label]) => (<th key={key}><button type="button" className="manager-sort" onClick={() => handleSort(key as SortKey)}><span>{label}</span><BsArrowDownUp size={12} /></button></th>))}<th>Actions</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan={7} className="text-center">Loading...</td></tr> : pagedRows.length === 0 ? <tr><td colSpan={7} className="text-center">No pending payments found.</td></tr> : pagedRows.map((row) => (<tr key={row.id}><td>{formatDate(row.due_date || row.created_at)}</td><td>{row.company_name || '—'}</td><td>{row.candidate_name || '—'}</td><td>{formatCurrency(row.pending_amount || row.total_amount)}</td><td><span className="pending-payments-report__status">{row.status || 'pending'}</span></td><td>{row.duration}</td><td><NavAction /></td></tr>))}</tbody>
          </table>
        </div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-2"><small className="text-muted">Showing {pagedRows.length} of {sortedRows.length} payments</small><div className="btn-group"><button className="btn btn-outline-secondary btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="btn btn-outline-secondary btn-sm" type="button" disabled>Page {page} of {totalPages}</button><button className="btn btn-outline-secondary btn-sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button></div></div>
      </section>
    </PageContainer>
  )
}

const NavAction = () => (
  <span className="pending-payments-report__actions">
    <NavLink className="pending-payments-report__icon-btn pending-payments-report__icon-btn--view" to="/tasks/payment-correction" aria-label="View payment correction" title="View"><BsEye /></NavLink>
    <NavLink className="pending-payments-report__icon-btn pending-payments-report__icon-btn--edit" to="/tasks/payment-correction" aria-label="Edit payment correction" title="Edit"><BsPencilFill /></NavLink>
  </span>
)

export default PendingPaymentsReport
