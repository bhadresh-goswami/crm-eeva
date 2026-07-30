import { useEffect, useState } from 'react'
import { createFeedback, getFeedbackByTaskId, type FeedbackPayload } from '../api/feedbackApi'

type Mode = 'ADD' | 'VIEW'

type Props = {
  open: boolean
  mode: Mode
  taskId: number | null
  onClose: () => void
  onSubmitted: () => void
}

const defaultForm: FeedbackPayload = {
  task_id: 0,
  company_name: '',
  interviewer_name: '',
  interview_round: '',
  communication: 1,
  technical: 1,
  confidence: 1,
  project_explanation: 1,
  read_proper: 'No',
  area_of_improvements: '',
  recording_url: '',
}

const FeedbackModal = ({ open, mode, taskId, onClose, onSubmitted }: Props) => {
  const [form, setForm] = useState<FeedbackPayload>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !taskId) return

    setError(null)
    if (mode === 'ADD') {
      setForm({ ...defaultForm, task_id: taskId })
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await getFeedbackByTaskId(taskId)
        setForm({
          task_id: taskId,
          company_name: String(data?.company_name ?? ''),
          interviewer_name: String(data?.interviewer_name ?? ''),
          interview_round: String(data?.interview_round ?? ''),
          communication: Number(data?.communication ?? 1),
          technical: Number(data?.technical ?? 1),
          confidence: Number(data?.confidence ?? 1),
          project_explanation: Number(data?.project_explanation ?? 1),
          read_proper: String(data?.read_proper ?? 'No') === 'Yes' ? 'Yes' : 'No',
          area_of_improvements: String(data?.area_of_improvements ?? ''),
          recording_url: String(data?.recording_url ?? ''),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch feedback')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open, taskId, mode])

  if (!open || !taskId) return null

  const readOnly = mode === 'VIEW'

  const onSubmit = async () => {
    if (readOnly) return
    setLoading(true)
    setError(null)
    try {
      await createFeedback({ ...form, task_id: taskId })
      onSubmitted()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const update = <K extends keyof FeedbackPayload>(key: K, value: FeedbackPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{mode === 'ADD' ? 'Add Feedback' : 'View Feedback'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">Company Name</label><input className="form-control" value={form.company_name} onChange={(e) => update('company_name', e.target.value)} readOnly={readOnly} /></div>
              <div className="col-md-6"><label className="form-label">Interviewer Name</label><input className="form-control" value={form.interviewer_name} onChange={(e) => update('interviewer_name', e.target.value)} readOnly={readOnly} /></div>
              <div className="col-md-6"><label className="form-label">Interview Round</label><input className="form-control" value={form.interview_round} onChange={(e) => update('interview_round', e.target.value)} readOnly={readOnly} /></div>
              <div className="col-md-3"><label className="form-label">Communication</label><input type="number" min={1} max={5} className="form-control" value={form.communication} onChange={(e) => update('communication', Math.max(1, Math.min(5, Number(e.target.value) || 1)))} readOnly={readOnly} /></div>
              <div className="col-md-3"><label className="form-label">Technical</label><input type="number" min={1} max={5} className="form-control" value={form.technical} onChange={(e) => update('technical', Math.max(1, Math.min(5, Number(e.target.value) || 1)))} readOnly={readOnly} /></div>
              <div className="col-md-3"><label className="form-label">Confidence</label><input type="number" min={1} max={5} className="form-control" value={form.confidence} onChange={(e) => update('confidence', Math.max(1, Math.min(5, Number(e.target.value) || 1)))} readOnly={readOnly} /></div>
              <div className="col-md-3"><label className="form-label">Project Explanation</label><input type="number" min={1} max={5} className="form-control" value={form.project_explanation} onChange={(e) => update('project_explanation', Math.max(1, Math.min(5, Number(e.target.value) || 1)))} readOnly={readOnly} /></div>
              <div className="col-md-4"><label className="form-label">Read Proper</label><select className="form-select" value={form.read_proper} onChange={(e) => update('read_proper', e.target.value)} disabled={readOnly}><option>Yes</option><option>No</option></select></div>
              <div className="col-md-8"><label className="form-label">Recording URL</label><input className="form-control" value={form.recording_url} onChange={(e) => update('recording_url', e.target.value)} readOnly={readOnly} /></div>
              <div className="col-12"><label className="form-label">Area of Improvements</label><textarea className="form-control" rows={3} value={form.area_of_improvements} onChange={(e) => update('area_of_improvements', e.target.value)} readOnly={readOnly} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {!readOnly ? <button type="button" className="btn btn-primary" onClick={() => void onSubmit()} disabled={loading}>{loading ? 'Saving...' : 'Submit'}</button> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
