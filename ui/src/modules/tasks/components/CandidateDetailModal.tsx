import { BsEye } from 'react-icons/bs'
import type { CandidateDetailRow } from '../services/candidatePerformanceReportService'

type CandidateDetailModalProps = {
  open: boolean
  candidateName: string
  loading: boolean
  rows: CandidateDetailRow[]
  onClose: () => void
  onFeedback: (feedbackId: number | string) => void
}

const CandidateDetailModal = ({ open, candidateName, loading, rows, onClose, onFeedback }: CandidateDetailModalProps) => {
  if (!open) return null

  return (
    <div className="modal fade show d-block" tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{candidateName} - Interview Details</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Task ID</th><th>Client Company</th><th>Technical Expert</th><th>Task Type</th><th>Status</th><th>Interview Date</th><th>ET Time</th><th>Duration</th><th>Feedback Status</th><th>Overall Score</th><th>Feedback View</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={11} className="text-center">Loading...</td></tr> : rows.length===0 ? <tr><td colSpan={11} className="text-center">No details found.</td></tr> : rows.map((r) => {
                    const feedbackId = r.feedback_id
                    return (
                      <tr key={r.task_id}>
                        <td>{r.task_id}</td><td>{r.company_name}</td><td>{r.technical_expert}</td><td>{r.task_type}</td><td>{r.task_status}</td><td>{r.interview_date}</td><td>{r.est_time || '--'}</td><td>{r.duration}</td><td><span className={`badge ${r.feedback_status==='Submitted'?'bg-success-subtle text-success':'bg-warning-subtle text-warning'}`}>{r.feedback_status}</span></td><td>{r.overall_score}</td><td>{feedbackId != null ? <button className="btn btn-outline-primary btn-sm" onClick={() => onFeedback(feedbackId)}><BsEye/></button> : 'No Feedback'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDetailModal
