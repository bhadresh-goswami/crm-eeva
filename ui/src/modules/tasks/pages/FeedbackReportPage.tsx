import { useEffect, useMemo, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getAllFeedback } from '../api/feedbackApi'

type Row = Record<string, unknown>

const FeedbackReportPage = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        setRows(await getAllFeedback())
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = useMemo(() => rows.filter((r) =>
    String(r.candidate_name ?? '').toLowerCase().includes(query.toLowerCase())
    || String(r.company_name ?? '').toLowerCase().includes(query.toLowerCase())), [rows, query])

  return (
    <PageContainer title="Feedback Report" description="All submitted feedback data across tasks.">
      <div className="card shadow-sm"><div className="card-body">
        <div className="mb-3"><input className="form-control" placeholder="Filter by candidate/company" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="table-responsive"><table className="table table-bordered table-hover table-sm align-middle">
          <thead className="table-light"><tr><th>Task</th><th>Date</th><th>Candidate</th><th>Company</th><th>Interviewer</th><th>Overall</th><th>Assigned To</th><th>Status</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8}>Loading...</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="text-center text-muted">No feedback data.</td></tr> : filtered.map((r) => (
              <tr key={String(r.id ?? Math.random())}><td>{String(r.task_id ?? '--')}</td><td>{String(r.due_date ?? '--')}</td><td>{String(r.candidate_name ?? '--')}</td><td>{String(r.company_name ?? '--')}</td><td>{String(r.interviewer_name ?? '--')}</td><td>{String(r.overall ?? '--')}</td><td>{String(r.assigned_to_name ?? '--')}</td><td>{String(r.task_status ?? '--')}</td></tr>
            ))}
          </tbody>
        </table></div>
      </div></div>
    </PageContainer>
  )
}

export default FeedbackReportPage
