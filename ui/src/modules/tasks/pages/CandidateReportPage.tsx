import { useEffect, useState } from 'react'
import PageContainer from '../../../shared/components/PageContainer'
import { getExpertTasks, type ExpertTaskItem } from '../api/expertTasksApi'

const CandidateReportPage = () => {
  const [rows, setRows] = useState<ExpertTaskItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await getExpertTasks({ feedbackOnly: true })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <PageContainer title="Candidate Report" description="Own and team tasks with submitted feedback.">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Task ID</th><th>Candidate</th><th>Status</th><th>Assigned To</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5}>Loading...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="text-center text-muted">No feedback report data found.</td></tr> : rows.map((r) => (
                  <tr key={r.task_id}>
                    <td>{r.task_id}</td><td>{r.candidate_name || '--'}</td><td className="text-capitalize">{r.status_name}</td><td>{r.assigned_to_name || '--'}</td><td>{r.due_date || '--'}</td>
                  </tr>
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
