import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'

type CandidateSummary = {
  candidate: string
  total: number
  completed: number
  cancelled: number
  rejected: number
  success: number
  avgFeedback: number
}

const CandidateReportPage = () => {
  const [rows, setRows] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [candidateFilter, setCandidateFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getExpertTasks()
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => rows.filter((r) => {
    const nameOk = r.candidate_name.toLowerCase().includes(candidateFilter.toLowerCase())
    const dateOk = (!fromDate || r.due_date >= fromDate) && (!toDate || r.due_date <= toDate)
    return nameOk && dateOk
  }), [rows, candidateFilter, fromDate, toDate])

  const summaryRows = useMemo<CandidateSummary[]>(() => {
    const map = new Map<string, CandidateSummary>()
    filtered.forEach((r) => {
      const key = r.candidate_name || 'Unknown'
      const current = map.get(key) ?? { candidate: key, total: 0, completed: 0, cancelled: 0, rejected: 0, success: 0, avgFeedback: 0 }
      const status = r.status_name.toLowerCase()
      current.total += 1
      if (status.includes('completed')) current.completed += 1
      if (status.includes('cancel')) current.cancelled += 1
      if (status.includes('reject')) current.rejected += 1
      if (status.includes('success') || status.includes('completed')) current.success += 1
      current.avgFeedback += Number(r.feedback_overall ?? 0)
      map.set(key, current)
    })
    return Array.from(map.values()).map((row) => ({
      ...row,
      avgFeedback: row.total > 0 ? Number((row.avgFeedback / row.total).toFixed(2)) : 0,
    })).sort((a, b) => b.total - a.total)
  }, [filtered])

  return (
    <PageContainer title="Candidate Report" description="Summary of interview outcomes by candidate.">
      <div className="card shadow-sm mb-3"><div className="card-body"><div className="row g-2"><div className="col-md-4"><input className="form-control" placeholder="Filter by candidate" value={candidateFilter} onChange={(e) => setCandidateFilter(e.target.value)} /></div><div className="col-md-3"><input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div><div className="col-md-3"><input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div><div className="col-md-2"><button type="button" className="btn btn-outline-secondary w-100" onClick={() => { setCandidateFilter(''); setFromDate(''); setToDate('') }}>Reset</button></div></div></div></div>
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-bordered align-middle">
              <thead className="table-light"><tr><th>Candidate</th><th>Total Interviews</th><th>Success</th><th>Rejected</th><th>Completed</th><th>Canceled</th><th>Avg Feedback</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7}>Loading...</td></tr> : summaryRows.length === 0 ? <tr><td colSpan={7} className="text-center text-muted">No candidate summary found.</td></tr> : summaryRows.map((r) => (
                  <tr key={r.candidate}><td>{r.candidate}</td><td>{r.total}</td><td>{r.success}</td><td>{r.rejected}</td><td>{r.completed}</td><td>{r.cancelled}</td><td>{r.avgFeedback}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

export default CandidateReportPage
