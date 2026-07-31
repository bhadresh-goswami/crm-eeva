import type { CSSProperties } from 'react'
import { FiBriefcase, FiCalendar, FiCheckCircle, FiClock, FiFileText, FiLayers, FiUser } from 'react-icons/fi'
import { getFeedbackConfiguration, type FeedbackFieldConfiguration } from '../api/feedbackApi'
import type { CandidateFeedbackData } from '../services/candidatePerformanceReportService'
import './FeedbackDetailModal.css'

type FeedbackData = CandidateFeedbackData | Record<string, unknown>

type FeedbackDetailModalProps = {
  open: boolean
  data: FeedbackData | null
  onClose: () => void
}

const legacyLabels: Record<string, string> = {
  interview_round: 'Interview Round', company_name: 'Company Name', interviewer_name: 'Interviewer Name',
  communication: 'Communication', technical: 'Technical Knowledge', confidence: 'Confidence',
  project_explanation: 'Project Explanation', read_proper: 'Read Proper',
  area_of_improvements: 'Areas for Improvement', recording_url: 'Recording URL', strengths: 'Strengths',
  recommendations: 'Recommendations', next_action: 'Next Action', additional_feedback: 'Additional Feedback',
}

const humanize = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim().toLowerCase() !== 'n/a'
const firstValue = (record: Record<string, unknown>, names: string[]) => names.map((name) => record[name]).find(hasValue)

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

const RatingStars = ({ value, label }: { value: unknown; label: string }) => {
  const score = Math.max(0, Math.min(5, Number(value) || 0))
  return <span className="feedback-detail-rating" aria-label={`${label}: ${score} out of 5`}>
    <span aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => <span className={star <= Math.round(score) ? 'is-filled' : ''} key={star}>★</span>)}</span>
    <strong>{score.toFixed(1)}</strong>
  </span>
}

const sectionClass = (section: string) => section === 'Strengths'
  ? 'is-strengths'
  : section === 'Additional Feedback' ? 'is-improvement' : section === 'Recommendations' ? 'is-recommendation' : section === 'Next Action' ? 'is-next-action' : ''

export const FeedbackDetailsContent = ({ data, showOverall = true }: { data: FeedbackData | null, showOverall?: boolean }) => {
  const record = (data ?? {}) as unknown as Record<string, unknown>
  const { grouped, taskType } = resolveFeedbackFields(record)
  const overallValue = Number(record.overall)
  const overallRating = Number.isFinite(overallValue) ? (overallValue > 5 ? overallValue / 20 : overallValue) : 0
  const overallPercent = Math.round(overallRating * 20)
  const candidateName = firstValue(record, ['candidate_name', 'candidate'])
  const candidateCode = firstValue(record, ['candidate_code', 'candidate_id'])
  const expertName = firstValue(record, ['assigned_to_name', 'expert_name', 'interviewer_name', 'created_by_name'])
  const infoItems = [
    { label: 'Task Type', value: taskType, icon: FiLayers },
    { label: 'Company', value: firstValue(record, ['company_name', 'client_company']), icon: FiBriefcase },
    { label: 'Expert', value: expertName, icon: FiUser },
    { label: 'Session Date', value: firstValue(record, ['due_date', 'task_date', 'created_at']), icon: FiCalendar },
    { label: 'Duration', value: firstValue(record, ['duration']), icon: FiClock },
    { label: 'Round / Topic', value: firstValue(record, ['interview_round', 'topic']), icon: FiFileText },
  ].filter((item) => hasValue(item.value))

  return <div className="feedback-detail-layout">
    <aside className="feedback-detail-profile">
      <div className="feedback-detail-person">
        <span className="feedback-detail-avatar" aria-hidden="true">{String(candidateName ?? 'C').trim().charAt(0).toUpperCase()}</span>
        <div><strong>{String(candidateName ?? 'Candidate')}</strong>{candidateCode ? <small>{String(candidateCode)}</small> : null}<span><FiCheckCircle /> Completed</span></div>
      </div>
      <div className="feedback-detail-meta">{infoItems.map(({ label, value, icon: Icon }) => <div key={label}><Icon aria-hidden="true" /><p><small>{label}</small><strong>{String(value)}</strong></p></div>)}</div>
    </aside>

    <div className="feedback-detail-main">
      {showOverall && hasValue(record.overall) ? <section className="feedback-detail-overall">
        <div><small>Overall Score</small><div className="feedback-detail-overall-rating"><span aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => <span className={star <= Math.round(overallRating) ? 'is-filled' : ''} key={star}>★</span>)}</span><strong>{overallRating.toFixed(1)} / 5</strong></div></div>
        <div className={`feedback-detail-gauge ${overallPercent >= 80 ? 'is-excellent' : overallPercent >= 60 ? 'is-good' : 'is-developing'}`} style={{ '--detail-score': `${overallPercent}%` } as CSSProperties}><span><strong>{overallPercent}%</strong><small>{overallPercent >= 80 ? 'Excellent' : overallPercent >= 60 ? 'Good' : 'Developing'}</small></span></div>
      </section> : null}

      {Object.keys(grouped).length === 0 ? <div className="text-center text-muted py-4">No feedback details available.</div> : <div className="feedback-detail-sections">
        {Object.entries(grouped).map(([section, items]) => <section className={`feedback-detail-section ${sectionClass(section)}`} key={section}>
          <h6>{section}</h6><div className="feedback-detail-fields">{items.map(([name, definition, value]) => <div className={definition.type === 'rating' ? 'feedback-detail-field is-rating' : 'feedback-detail-field'} key={name}>
            <span>{definition.label}</span>{definition.type === 'rating' ? <RatingStars value={value} label={definition.label} /> : name === 'recording_url' ? <a href={String(value)} target="_blank" rel="noreferrer">View recording</a> : <strong>{String(value)}</strong>}
          </div>)}</div>
        </section>)}
      </div>}
    </div>
  </div>
}

const FeedbackDetailModal = ({ open, data, onClose }: FeedbackDetailModalProps) => {
  if (!open) return null
  const record = (data ?? {}) as unknown as Record<string, unknown>
  const { taskType } = resolveFeedbackFields(record)

  return <div className="modal fade show d-block feedback-detail-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-detail-title">
    <div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content border-0 shadow-lg">
      <div className="modal-header"><div><span className="feedback-detail-kicker">{taskType || 'Performance Evaluation'}</span><h5 className="modal-title" id="feedback-detail-title">Feedback Details</h5></div>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close" /></div>
      <div className="modal-body"><FeedbackDetailsContent data={record} /></div>
      <div className="modal-footer"><button type="button" className="btn btn-outline-secondary px-4" onClick={onClose}>Close</button></div>
    </div></div>
  </div>
}

export default FeedbackDetailModal
