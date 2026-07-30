import type { CandidateFeedbackData } from '../services/candidatePerformanceReportService'

type FeedbackDetailModalProps = {
  open: boolean
  data: CandidateFeedbackData | null
  onClose: () => void
}

const FeedbackDetailModal = ({ open, data, onClose }: FeedbackDetailModalProps) => {
  if (!open) return null
  return <div className="modal fade show d-block" tabIndex={-1}><div className="modal-dialog modal-lg"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Feedback Details</h5><button className="btn-close" onClick={onClose}/></div><div className="modal-body"><div className="row g-2">{[
    ['Interview Round', data?.interview_round],['Company Name', data?.company_name],['Interviewer Name', data?.interviewer_name],['Communication Score', data?.communication],['Technical Score', data?.technical],['Confidence Score', data?.confidence],['Project Explanation Score', data?.project_explanation],['Read Proper', data?.read_proper],['Area of Improvements', data?.area_of_improvements],['Recording URL', data?.recording_url],['Overall Score', data?.overall]
  ].map(([k,v])=> <div className="col-12 col-md-6" key={k}><div className="border rounded p-2 bg-light"><small className="text-muted d-block">{k}</small><strong>{v ?? '--'}</strong></div></div>)}</div></div></div></div></div>
}
export default FeedbackDetailModal
