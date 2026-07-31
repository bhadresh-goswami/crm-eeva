import { getFeedbackConfiguration, type FeedbackFieldConfiguration } from '../api/feedbackApi'
import type { CandidateFeedbackData } from '../services/candidatePerformanceReportService'

type FeedbackData = CandidateFeedbackData | Record<string, unknown>

type FeedbackDetailModalProps = {
  open: boolean
  data: FeedbackData | null
  onClose: () => void
}

const legacyLabels: Record<string, string> = {
  interview_round: 'Interview Round', company_name: 'Company Name', interviewer_name: 'Interviewer Name',
  communication: 'Communication Score', technical: 'Technical Score', confidence: 'Confidence Score',
  project_explanation: 'Project Explanation Score', read_proper: 'Read Proper',
  area_of_improvements: 'Area of Improvements', recording_url: 'Recording URL', strengths: 'Strengths',
  recommendations: 'Recommendations', next_action: 'Next Action', additional_feedback: 'Additional Feedback',
}

const humanize = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim().toLowerCase() !== 'n/a'

const resolveFeedbackFields = (record: Record<string, unknown>) => {
  const taskType = String(record.task_type ?? '')
  const configured = getFeedbackConfiguration(taskType, record.visible_fields)
  const custom = record.custom_fields && typeof record.custom_fields === 'object' && !Array.isArray(record.custom_fields)
    ? record.custom_fields as Record<string, unknown>
    : {}
  Object.keys(custom).forEach((name) => {
    if (configured[name]) configured[name] = { ...configured[name], storage: 'custom' }
  })

  const fields: FeedbackFieldConfiguration = Object.keys(configured).length > 0 ? configured : Object.fromEntries([
    ...Object.keys(legacyLabels).filter((name) => hasValue(record[name])).map((name) => [name, { label: legacyLabels[name], type: 'text' as const, section: name === 'strengths' ? 'Strengths' : name === 'recommendations' ? 'Recommendations' : name === 'next_action' ? 'Next Action' : 'Feedback Details' }]),
    ...Object.keys(custom).filter((name) => hasValue(custom[name])).map((name) => [name, { label: humanize(name), type: 'text' as const, storage: 'custom' as const, section: 'Assessment' }]),
  ])

  const grouped = Object.entries(fields).reduce<Record<string, Array<[string, FeedbackFieldConfiguration[string], unknown]>>>((sections, [name, definition]) => {
    const value = definition.storage === 'custom' ? custom[name] : record[name]
    if (!hasValue(value)) return sections
    if (!sections[definition.section]) sections[definition.section] = []
    sections[definition.section].push([name, definition, value])
    return sections
  }, {})

  return { grouped, taskType }
}

export const FeedbackDetailsContent = ({ data, showOverall = true }: { data: FeedbackData | null, showOverall?: boolean }) => {
  const record = (data ?? {}) as unknown as Record<string, unknown>
  const { grouped } = resolveFeedbackFields(record)
  return <>
    {showOverall && hasValue(record.overall) ? <div className="alert alert-primary d-flex justify-content-between align-items-center"><span>Overall Score</span><strong className="fs-5">{String(record.overall)}</strong></div> : null}
    {Object.keys(grouped).length === 0 ? <div className="text-center text-muted py-4">No feedback details available.</div> : <div className="d-flex flex-column gap-3">
      {Object.entries(grouped).map(([section, items]) => <section className="card border-0 shadow-sm" key={section}><div className="card-body">
        <h6 className="text-primary border-bottom pb-2 mb-3">{section}</h6><div className="row g-3">{items.map(([name, definition, value]) => <div className={definition.type === 'rating' ? 'col-12 col-sm-6 col-lg-4' : 'col-12 col-md-6'} key={name}>
          <div className="h-100 border rounded-3 p-3 bg-white"><small className="text-muted d-block mb-1">{definition.label}</small><strong className="text-break">{String(value)}{definition.type === 'rating' ? ` / ${definition.max ?? 5}` : ''}</strong></div>
        </div>)}</div>
      </div></section>)}
    </div>}
  </>
}

const FeedbackDetailModal = ({ open, data, onClose }: FeedbackDetailModalProps) => {
  if (!open) return null
  const record = (data ?? {}) as unknown as Record<string, unknown>
  const { taskType } = resolveFeedbackFields(record)

  return <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
    <div className="modal-dialog modal-lg modal-dialog-scrollable"><div className="modal-content border-0 shadow-lg">
      <div className="modal-header bg-light"><div><h5 className="modal-title mb-1">Feedback Details</h5>{taskType ? <span className="badge text-bg-primary">{taskType}</span> : null}</div>
        {hasValue(record.overall) ? <div className="ms-auto me-3 text-end"><small className="text-muted d-block">Overall Score</small><strong className="fs-4 text-primary">{String(record.overall)}</strong></div> : null}
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
      <div className="modal-body bg-body-tertiary"><FeedbackDetailsContent data={record} showOverall={false} /></div>
      <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button></div>
    </div></div>
  </div>
}

export default FeedbackDetailModal
