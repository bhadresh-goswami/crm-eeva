import { useEffect, useMemo, useState } from 'react'
import { BsArrowClockwise, BsDownload } from 'react-icons/bs'
import PageContainer from '../../../shared/components/PageContainer'
import { getExpertAvailabilityMatrixReport, type ExpertAvailabilityMatrixFilters, type ExpertAvailabilityMatrixResponse } from '../api/tasksApi'

type Slot = ExpertAvailabilityMatrixResponse['slots'][number]

const statusClasses: Record<string, string> = {
  assigned: 'bg-warning text-dark',
  running: 'bg-primary text-white',
  completed: 'bg-success text-white',
  no_show: 'bg-light text-dark',
  rescheduled: 'bg-danger text-white',
}

const defaultFilters = (): ExpertAvailabilityMatrixFilters => ({
  date: new Date().toISOString().slice(0, 10),
  expert_id: '',
  task_type_id: '',
  status: '',
})

const ExpertAvailabilityMatrixReportPage = () => {
  const [filters, setFilters] = useState<ExpertAvailabilityMatrixFilters>(defaultFilters)
  const [data, setData] = useState<ExpertAvailabilityMatrixResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setData(await getExpertAvailabilityMatrixReport(filters)) } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load report') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    const id = window.setInterval(() => { void load() }, 60000)
    return () => window.clearInterval(id)
  }, [filters])

  const slotRows = useMemo(() => data?.slots ?? [], [data])

  const exportExcel = () => {
    if (!data) return
    const table = document.getElementById('expert-availability-matrix-table')
    if (!table) return
    const html = `<html><head><meta charset="UTF-8" /></head><body>${table.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `expert-availability-${filters.date || 'today'}.xls`; a.click(); URL.revokeObjectURL(url)
  }

  return <PageContainer title="Today's Task Report" description="Expert Availability Matrix (IST/EST slots)">
    <div className="card shadow-sm mb-3"><div className="card-body"><div className="row g-2 align-items-end">
      <div className='col-md-3'><label className='form-label small fw-semibold'>Date</label><input type='date' className='form-control form-control-sm' value={filters.date} onChange={(e)=>setFilters((p)=>({...p,date:e.target.value}))}/></div>
      <div className='col-md-3'><label className='form-label small fw-semibold'>Expert</label><select className='form-select form-select-sm' value={filters.expert_id} onChange={(e)=>setFilters((p)=>({...p,expert_id:e.target.value}))}><option value=''>All experts</option>{data?.filters.experts.map((x)=><option key={x.id} value={String(x.id)}>{x.name}</option>)}</select></div>
      <div className='col-md-3'><label className='form-label small fw-semibold'>Task Type</label><select className='form-select form-select-sm' value={filters.task_type_id} onChange={(e)=>setFilters((p)=>({...p,task_type_id:e.target.value}))}><option value=''>All task types</option>{data?.filters.task_types.map((x)=><option key={x.id} value={String(x.id)}>{x.name}</option>)}</select></div>
      <div className='col-md-3'><label className='form-label small fw-semibold'>Status</label><select className='form-select form-select-sm' value={filters.status} onChange={(e)=>setFilters((p)=>({...p,status:e.target.value}))}><option value=''>All statuses</option>{data?.filters.statuses.map((x)=><option key={x.key} value={x.key}>{x.label}</option>)}</select></div>
      <div className='col-12 d-flex gap-2 justify-content-end'><button className='btn btn-primary btn-sm' onClick={()=>void load()} disabled={loading}>{loading?'Loading...':'Apply Filters'}</button><button className='btn btn-outline-secondary btn-sm' onClick={()=>void load()}><BsArrowClockwise className='me-1'/>Refresh</button><button className='btn btn-success btn-sm' onClick={exportExcel} disabled={!data}><BsDownload className='me-1'/>Export Excel</button></div>
    </div></div></div>
    {error ? <div className='alert alert-danger py-2'>{error}</div> : null}
    <div className='table-responsive border rounded' style={{ maxHeight: '70vh' }}><table id='expert-availability-matrix-table' className='table table-bordered table-sm mb-0 align-middle' style={{ fontSize: '12px', minWidth: '1200px' }}>
      <thead className='table-light' style={{ position: 'sticky', top: 0, zIndex: 3 }}><tr><th>IST Time Slot</th><th>EST Time Slot</th>{data?.experts.map((e)=><th key={e.id}>{e.name}</th>)}</tr></thead>
      <tbody>{loading && !data ? <tr><td colSpan={3} className='text-center py-4'>Loading...</td></tr> : slotRows.map((slot)=><tr key={slot.slot_key}><td>{slot.ist_label}</td><td>{slot.est_label}</td>{data?.experts.map((expert)=>{const task = slot.tasks_by_expert[String(expert.id)] as Slot['tasks_by_expert'][string] | undefined; if(!task) return <td key={`${slot.slot_key}-${expert.id}`} />; return <td key={`${slot.slot_key}-${expert.id}`}><span className={`badge rounded-pill ${statusClasses[task.status_key] ?? 'bg-secondary text-white'}`} style={{ whiteSpace: 'normal', fontSize: '11px' }}>{task.candidate_name} - {task.task_type}</span></td>})}</tr>)}</tbody>
    </table></div>
  </PageContainer>
}

export default ExpertAvailabilityMatrixReportPage
