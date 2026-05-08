import { useEffect, useMemo, useState } from 'react'
import { BsDownload, BsEye } from 'react-icons/bs'
import { getTaskFilterOptions, getTechVsTaskDetails, getTechVsTasksSummary, type TechVsTaskDetailRow, type TechVsTasksSummaryRow } from '../api/tasksApi'
import { getClients } from '../../clients/api/clientsApi'

type SelectOption = {
  id: number | string
  name: string
}

type ReportFilters = {
  candidate_id: string
  expert_id: string
  task_type_id: string
  client_id: string
  status: string
  from_date: string
  to_date: string
  limit: number
  page: number
}

const today = new Date(); const toDateDefault = today.toISOString().slice(0, 10); const from = new Date(today); from.setDate(from.getDate() - 30); const fromDateDefault = from.toISOString().slice(0, 10)

const TechVsTasksReport = () => {
  const [filters, setFilters] = useState<ReportFilters>({ candidate_id: '', expert_id: '', task_type_id: '', client_id: '', status: '', from_date: fromDateDefault, to_date: toDateDefault, limit: 10, page: 1 })
  const [options, setOptions] = useState<{ candidates: SelectOption[]; assignees: SelectOption[]; task_types: SelectOption[]; clients: SelectOption[] }>({ candidates: [], assignees: [], task_types: [], clients: [] })
  const [rows, setRows] = useState<TechVsTasksSummaryRow[]>([]); const [loading, setLoading] = useState(false); const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selected, setSelected] = useState<TechVsTasksSummaryRow | null>(null); const [detailRows, setDetailRows] = useState<TechVsTaskDetailRow[]>([]); const [detailLoading, setDetailLoading] = useState(false)
  const loadSummary = async () => { setLoading(true); try { setRows(await getTechVsTasksSummary(filters)); setLastUpdated(new Date()) } finally { setLoading(false) } }
  useEffect(() => { void Promise.all([getTaskFilterOptions(), getClients()]).then(([d, c]) => setOptions({ ...d, clients: c.map((x) => ({ id: x.id, name: x.company_name })) })).catch(() => {}); void loadSummary() }, [])
  const openDetails = async (row: TechVsTasksSummaryRow) => { setSelected(row); setDetailLoading(true); const payload = { expert_id: row.expert_id, from_date: filters.from_date || '', to_date: filters.to_date || '', task_type_id: filters.task_type_id || '', client_id: filters.client_id || '', status_type: filters.status || '' }; console.log('Task detail payload', payload); try { const response = await getTechVsTaskDetails(payload); console.log(response); setDetailRows(Array.isArray(response) ? response : []) } finally { setDetailLoading(false) } }
  const cards = useMemo(() => ({ totalHours: rows.reduce((s, r) => s + Number(r.total_completed_hours || 0), 0), completed: rows.reduce((s, r) => s + Number(r.completed_count || 0), 0), success: rows.reduce((s, r) => s + Number(r.success_count || 0), 0), rejected: rows.reduce((s, r) => s + Number(r.rejected_count || 0), 0), ratio: rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.success_ratio || 0), 0) / rows.length) : 0 }), [rows])

  return <div className="page-container">
    <div className="page-container__header"><div><h1 className="page-title mb-1">Tech Vs Tasks Report</h1><p className="page-description mb-0">Technical expert performance analytics with productivity insights.</p></div><div className="d-flex gap-2"><button className="btn btn-success btn-sm" onClick={() => { const csv = ['Technical Expert,Total Completed Hrs,Completed,Success,Rejected,Success %', ...rows.map((r) => `${r.technical_expert},${r.total_completed_hours},${r.completed_count},${r.success_count},${r.rejected_count},${Math.round(Number(r.success_ratio))}%`)].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'tech_vs_tasks.csv'; a.click() }}><BsDownload className="me-1"/>Export Excel</button><button className="btn btn-outline-secondary btn-sm" onClick={loadSummary}>Refresh</button></div></div>
    <small className="text-muted">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '--'}</small>
    <div className="card"><h3 className="card-title mb-3">Filters</h3><div className="row g-2 g-md-3">
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Candidate</label><select className="form-select" value={filters.candidate_id} onChange={(e) => setFilters((p) => ({ ...p, candidate_id: e.target.value }))}><option value="">All Candidate</option>{options.candidates.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Technical Expert</label><select className="form-select" value={filters.expert_id} onChange={(e) => setFilters((p) => ({ ...p, expert_id: e.target.value }))}><option value="">All Technical Expert</option>{options.assignees.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Task Type</label><select className="form-select" value={filters.task_type_id} onChange={(e) => setFilters((p) => ({ ...p, task_type_id: e.target.value }))}><option value="">All Task Type</option>{options.task_types.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Client Company</label><select className="form-select" value={filters.client_id} onChange={(e) => setFilters((p) => ({ ...p, client_id: e.target.value }))}><option value="">All Client Company</option>{options.clients.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">Status</label><select className="form-select" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}><option value="">All Status</option></select></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">From Date</label><input type="date" className="form-control" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}/></div>
      <div className="col-12 col-sm-6 col-lg-3"><label className="form-label">To Date</label><input type="date" className="form-control" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}/></div>
      <div className="col-12 d-flex gap-2 justify-content-end mt-2"><button className="btn btn-primary btn-sm" onClick={loadSummary}>Apply Filter</button><button className="btn btn-outline-secondary btn-sm" onClick={() => setFilters({ candidate_id: '', expert_id: '', task_type_id: '', client_id: '', status: '', from_date: fromDateDefault, to_date: toDateDefault, limit: 10, page: 1 })}>Reset</button></div>
    </div></div>
    <div className="metric-grid">{[{l:'Total Hours',v:cards.totalHours.toFixed(2)},{l:'Completed Tasks',v:cards.completed},{l:'Success Tasks',v:cards.success},{l:'Rejected Tasks',v:cards.rejected},{l:'Success Ratio',v:`${cards.ratio}%`}].map((c)=><div key={c.l} className="card"><div className="metric-card__title">{c.l}</div><div className="metric-card__value">{c.v}</div></div>)}</div>
    <div className="table-card"><div className="d-flex justify-content-end align-items-center gap-2 p-2"><small className="text-muted">Rows:</small><select className="form-select form-select-sm" style={{ width: 90 }} value={String(filters.limit)} onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}><option value="10">10</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></select><button className="btn btn-primary btn-sm" onClick={loadSummary}>Apply</button></div><div className="table-wrapper manager-reports-table__wrapper"><table className="table table-hover table-bordered align-middle manager-reports-table mb-0"><thead><tr><th>Technical Expert</th><th className="text-center">Total Completed Hrs</th><th className="text-center">Completed</th><th className="text-center">Success</th><th className="text-center">Rejected</th><th className="text-center">Success %</th><th className="text-center">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="text-center">Loading...</td></tr> : rows.length===0 ? <tr><td colSpan={7} className="text-center">No records found for selected filters.</td></tr> : rows.map((r) => <tr key={r.expert_id}><td>{r.technical_expert}</td><td className="text-center">{Number(r.total_completed_hours).toFixed(2)}</td><td className="text-center">{r.completed_count}</td><td className="text-center"><span className="badge bg-success-subtle text-success">{r.success_count}</span></td><td className="text-center"><span className="badge bg-danger-subtle text-danger">{r.rejected_count}</span></td><td className="text-center fw-semibold">{Math.round(Number(r.success_ratio))}%</td><td className="text-center"><button className="btn btn-outline-primary btn-sm" title="View Task Details" onClick={() => openDetails(r)}><BsEye/></button></td></tr>)}</tbody></table></div></div>
    <div className={`modal fade ${selected ? 'show d-block' : ''}`} tabIndex={-1}><div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">{selected?.technical_expert || 'Technical Expert'} - Task Details</h5><button className="btn-close" onClick={() => setSelected(null)} /></div><div className="modal-body"><div className="table-responsive"><table className="table table-hover table-bordered align-middle table-sm"><thead className="table-light"><tr><th>Task ID</th><th>Candidate Name</th><th>Client Company</th><th>Task Type</th><th>Status</th><th>Task Date</th><th>EST Time</th><th>Duration</th><th>Feedback Status</th><th>Average Score</th><th>Assigned By</th><th>Action/View</th></tr></thead><tbody>{detailLoading ? <tr><td colSpan={12} className="text-center">Loading...</td></tr> : detailRows.map((r) => <tr key={r.task_id}><td>{r.task_id}</td><td>{r.candidate_name}</td><td>{r.client_company}</td><td>{r.task_type}</td><td>{r.status}</td><td>{r.task_date}</td><td>{r.est_time}</td><td>{r.duration}</td><td>{r.feedback_status}</td><td>{r.average_score ?? '--'}</td><td>{r.assigned_by}</td><td><button className="btn btn-outline-primary btn-sm"><BsEye/></button></td></tr>)}</tbody></table></div></div></div></div></div>
  </div>
}

export default TechVsTasksReport
