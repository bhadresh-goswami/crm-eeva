import { useEffect, useState } from 'react'
import { BsArrowClockwise, BsDownload, BsEye } from 'react-icons/bs'
import { getCandidates } from '../../candidates/api/candidatesApi'
import { getClients } from '../../clients/api/clientsApi'
import CandidateDetailModal from '../components/CandidateDetailModal'
import FeedbackDetailModal from '../components/FeedbackDetailModal'
import {
  getCandidatePerformance,
  getCandidatePerformanceDetails,
  getCandidatePerformanceFeedback,
  type CandidateDetailRow,
  type CandidateFeedbackData,
  type CandidatePerformanceFilters,
  type CandidatePerformanceRow,
} from '../services/candidatePerformanceReportService'

type OptionItem = { id: number | string; name?: string; company_name?: string }

const CandidatePerformanceReport = () => {
const [rows,setRows]=useState<CandidatePerformanceRow[]>([]); const [loading,setLoading]=useState(false); const [filters,setFilters]=useState<CandidatePerformanceFilters>({candidate_id:'',client_id:'',from_date:'',to_date:'',search:'',page:1,limit:10}); const [opts,setOpts]=useState<{candidates: OptionItem[]; clients: OptionItem[]}>({candidates:[],clients:[]}); const [detailOpen,setDetailOpen]=useState(false); const [details,setDetails]=useState<CandidateDetailRow[]>([]); const [detailLoading,setDetailLoading]=useState(false); const [selectedName,setSelectedName]=useState('Candidate'); const [feedbackOpen,setFeedbackOpen]=useState(false); const [feedback,setFeedback]=useState<CandidateFeedbackData | null>(null)
const load=async()=>{setLoading(true); try {const res=await getCandidatePerformance(filters); setRows(res?.data?.rows||[])} finally {setLoading(false)}}
useEffect(()=>{void load()},[])
useEffect(()=>{void Promise.all([getCandidates(),getClients()]).then(([c,cl])=>setOpts({candidates:c,clients:cl}))},[])
const openDetails=async(r: CandidatePerformanceRow)=>{setSelectedName(r.candidate_name); setDetailOpen(true); setDetailLoading(true); try{const res=await getCandidatePerformanceDetails(r.candidate_id); setDetails(res?.data?.rows||[])}finally{setDetailLoading(false)}}
const openFeedback=async(id: number | string)=>{const res=await getCandidatePerformanceFeedback(id); setFeedback(res?.data||null); setFeedbackOpen(true)}
return <div className="page-container"><div className="page-container__header"><div><h1 className="page-title mb-1">Candidate Performance Report</h1></div><div className="d-flex gap-2"><button className="btn btn-success btn-sm" onClick={()=>{const csv=['Candidate,Company,Total,Completed,Success,Rejected,Overall Score,Success %',...rows.map(r=>`${r.candidate_name},${r.company_name},${r.total_interviews},${r.completed_count},${r.success_count},${r.rejected_count},${r.overall_score},${r.success_percentage}%`)].join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='candidate-performance-report.csv'; a.click()}}><BsDownload className="me-1"/>Export Excel</button><button className="btn btn-outline-secondary btn-sm" onClick={load}><BsArrowClockwise className="me-1"/>Refresh</button></div></div>
<div className="card"><h3 className="card-title mb-3">Filters</h3><div className="row g-2"><div className="col-md-3"><label className="form-label">Candidate Name</label><select className="form-select" value={filters.candidate_id ?? ''} onChange={e=>setFilters(p=>({...p,candidate_id:e.target.value}))}><option value="">All</option>{opts.candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="col-md-3"><label className="form-label">Company Name</label><select className="form-select" value={filters.client_id ?? ''} onChange={e=>setFilters(p=>({...p,client_id:e.target.value}))}><option value="">All</option>{opts.clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div><div className="col-md-2"><label className="form-label">From Date</label><input type="date" className="form-control" value={filters.from_date ?? ''} onChange={e=>setFilters(p=>({...p,from_date:e.target.value}))}/></div><div className="col-md-2"><label className="form-label">To Date</label><input type="date" className="form-control" value={filters.to_date ?? ''} onChange={e=>setFilters(p=>({...p,to_date:e.target.value}))}/></div><div className="col-md-2"><label className="form-label">Search</label><input className="form-control" value={filters.search ?? ''} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}/></div><div className="col-12 d-flex justify-content-end gap-2"><button className="btn btn-primary btn-sm" onClick={load}>Apply Filter</button><button className="btn btn-outline-secondary btn-sm" onClick={()=>{setFilters({candidate_id:'',client_id:'',from_date:'',to_date:'',search:'',page:1,limit:10});}}>Reset</button></div></div></div>
<div className="table-card"><div className="table-wrapper manager-reports-table__wrapper"><table className="table table-hover table-bordered align-middle manager-reports-table mb-0"><thead><tr><th>Candidate Name</th><th>Company Name</th><th>Total Interviews</th><th>Completed</th><th>Success</th><th>Rejected</th><th>Overall Score</th><th>Success %</th><th>Action</th></tr></thead><tbody>{loading?<tr><td colSpan={9} className="text-center">Loading...</td></tr>:rows.length===0?<tr><td colSpan={9} className="text-center">No data found.</td></tr>:rows.map(r=><tr key={`${r.candidate_id}-${r.company_name}`}><td>{r.candidate_name}</td><td>{r.company_name}</td><td>{r.total_interviews}</td><td><span className="badge bg-primary-subtle text-primary">{r.completed_count}</span></td><td><span className="badge bg-success-subtle text-success">{r.success_count}</span></td><td><span className="badge bg-danger-subtle text-danger">{r.rejected_count}</span></td><td>{r.overall_score ?? '--'}</td><td>{r.success_percentage}%</td><td><button className="btn btn-outline-primary btn-sm" onClick={()=>openDetails(r)}><BsEye/></button></td></tr>)}</tbody></table></div></div>
<CandidateDetailModal open={detailOpen} candidateName={selectedName} loading={detailLoading} rows={details} onClose={()=>setDetailOpen(false)} onFeedback={openFeedback} />
<FeedbackDetailModal open={feedbackOpen} data={feedback} onClose={()=>setFeedbackOpen(false)} />
</div>
}

export default CandidatePerformanceReport
