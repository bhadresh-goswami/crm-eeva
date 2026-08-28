import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react'
import {
  FiAward,
  FiCheck,
  FiCheckCircle,
  FiClipboard,
  FiInfo,
  FiMessageCircle,
  FiSave,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiX,
} from 'react-icons/fi'
import {
  createFeedback,
  FEEDBACK_SUBMITTED_EVENT,
  getFeedbackByTaskId,
  getFeedbackConfiguration,
  type FeedbackFieldConfiguration,
  type FeedbackPayload,
  type FeedbackRecord,
  type FeedbackValue,
} from '../api/feedbackApi'
import { FeedbackDetailsContent } from './FeedbackDetailModal'
import './FeedbackModal.css'

type Mode = 'ADD' | 'VIEW'

type Props = {
  open: boolean
  mode: Mode
  taskId: number | null
  taskType?: string
  onClose: () => void
  onSubmitted: () => void
}

const isPresent = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== ''

const sectionDetails: Record<string, { description: string; icon: typeof FiClipboard }> = {
  'Interview Details': { description: 'Confirm the context of this evaluation before assessing performance.', icon: FiClipboard },
  'Communication Assessment': { description: 'Evaluate how clearly and confidently the candidate communicated during the session.', icon: FiMessageCircle },
  'Technical Assessment': { description: 'Assess practical understanding, problem solving, accuracy, and ownership.', icon: FiTrendingUp },
  'Career Assessment': { description: 'Consider the candidate’s goals, direction, motivation, and role alignment.', icon: FiTarget },
  'Resume Review': { description: 'Review resume accuracy, experience relevance, and alignment of skills.', icon: FiUser },
  'Training Assessment': { description: 'Reflect on participation, engagement, and completion of assigned work.', icon: FiAward },
  'Candidate Readiness': { description: 'Assess readiness for a real interview across communication, technical, and professional skills.', icon: FiTarget },
  Strengths: { description: 'Highlight the qualities and behaviours the candidate should continue building on.', icon: FiAward },
  Recommendations: { description: 'Share clear, practical guidance that will help the candidate move forward.', icon: FiTarget },
  'Next Action': { description: 'Choose the most useful next step or provide a tailored recommendation.', icon: FiCheckCircle },
  'Additional Feedback': { description: 'Add any helpful context, improvement areas, notes, or supporting resources.', icon: FiInfo },
}

const fieldCopy: Record<string, { label?: string; helper?: string; placeholder?: string }> = {
  communication: { helper: 'Consider clarity, listening, confidence, fluency, and professionalism.' },
  technical: { label: 'Technical knowledge', helper: 'Evaluate core concepts, problem solving, practical understanding, and accuracy.' },
  confidence: { helper: 'How confident was the candidate while answering questions?' },
  project_explanation: { helper: 'Consider ownership, architecture, decision making, and real contribution.' },
  resume_quality: { helper: 'Consider resume accuracy, experience relevance, and skills match.' },
  resume_readiness: { helper: 'Consider resume accuracy, experience relevance, and skills match.' },
  career_clarity: { helper: 'Evaluate career goals, direction, and motivation.' },
  career_goal_understanding: { helper: 'Evaluate career goals, direction, and motivation.' },
  strengths: { placeholder: 'Describe the candidate’s strongest qualities… e.g. Strong communication skills with good confidence while answering technical questions.' },
  area_of_improvements: { label: 'What should the candidate improve?', placeholder: 'Describe the most valuable improvement areas… e.g. Needs deeper understanding of backend architecture and API design.' },
  recommendations: { label: 'What do you recommend for the candidate?', placeholder: 'Share a practical recommendation… e.g. Recommend additional mock interviews focusing on system design.' },
  next_action: { helper: 'Select a quick suggestion below or write a custom next step.', placeholder: 'Choose or describe the best next action…' },
  additional_feedback: { label: 'Anything else you’d like to share?', placeholder: 'Add any final context that would help the candidate succeed…' },
  recording_url: { placeholder: 'Paste a recording link, if available…' },
}

const ratingLabels = ['Not rated', 'Poor', 'Needs Improvement', 'Average', 'Good', 'Excellent']
const nextActionSuggestions = ['Mock Interview', 'Technical Training', 'Resume Update', 'Communication Practice', 'Career Counselling', 'Certification', 'Other']

const FeedbackModal = ({ open, mode, taskId, taskType = '', onClose, onSubmitted }: Props) => {
  const [form, setForm] = useState<Record<string, FeedbackValue>>({})
  const [configuration, setConfiguration] = useState<FeedbackFieldConfiguration>({})
  const [resolvedTaskType, setResolvedTaskType] = useState(taskType)
  const [overall, setOverall] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [detailRecord, setDetailRecord] = useState<FeedbackRecord>({})

  useEffect(() => {
    if (!open || !taskId) return

    setError(null)
    setValidation({})
    setOverall(null)
    setSubmitted(false)
    setDetailRecord({})
    if (mode === 'ADD') {
      const nextType = taskType.trim()
      setResolvedTaskType(nextType)
      setConfiguration(getFeedbackConfiguration(nextType))
      setForm({})
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await getFeedbackByTaskId(taskId)
        const nextType = String(data?.task_type ?? taskType).trim()
        const custom = data?.custom_fields && typeof data.custom_fields === 'object' && !Array.isArray(data.custom_fields)
          ? data.custom_fields as FeedbackRecord
          : {}
        const fields = getFeedbackConfiguration(nextType, data?.visible_fields)
        Object.keys(custom).forEach((name) => {
          if (fields[name]) fields[name] = { ...fields[name], storage: 'custom' }
        })
        setResolvedTaskType(nextType)
        setDetailRecord(data ?? {})
        setConfiguration(fields)
        setOverall(data?.overall ?? null)
        setForm(Object.fromEntries(Object.keys(fields).map((name) => {
          const value = fields[name].storage === 'custom' ? custom[name] : data?.[name]
          return [name, (value ?? '') as FeedbackValue]
        })))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to fetch feedback')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open, taskId, mode, taskType])

  const sections = useMemo(() => Object.entries(configuration).reduce<Record<string, Array<[string, FeedbackFieldConfiguration[string]]>>>((groups, entry) => {
    const section = entry[1].section
    if (!groups[section]) groups[section] = []
    groups[section].push(entry)
    return groups
  }, {}), [configuration])

  const ratingEntries = useMemo(() => Object.entries(configuration).filter(([, field]) => field.type === 'rating'), [configuration])
  const completion = useMemo(() => {
    const names = Object.keys(configuration)
    if (names.length === 0) return 0
    return Math.round((names.filter((name) => isPresent(form[name])).length / names.length) * 100)
  }, [configuration, form])
  const liveScore = useMemo(() => {
    const scores = ratingEntries.map(([name]) => Number(form[name])).filter((score) => Number.isFinite(score) && score > 0)
    if (scores.length === 0) return null
    return Math.round((scores.reduce((total, score) => total + score, 0) / (scores.length * 5)) * 100)
  }, [form, ratingEntries])

  if (!open || !taskId) return null

  const readOnly = mode === 'VIEW'

  const onSubmit = async () => {
    if (readOnly) return
    const errors: Record<string, string> = {}
    Object.entries(configuration).forEach(([name, field]) => {
      const value = form[name]
      if (field.required && !isPresent(value)) errors[name] = `${field.label} is required`
      if (isPresent(value) && field.type === 'rating') {
        const score = Number(value)
        if (!Number.isFinite(score)) errors[name] = `${field.label} must be numeric`
        else if ((field.min !== undefined && score < field.min) || (field.max !== undefined && score > field.max)) {
          errors[name] = `${field.label} must be between ${field.min ?? 1} and ${field.max ?? 5}`
        }
      }
    })
    setValidation(errors)
    if (Object.keys(errors).length > 0) return

    const payload: FeedbackPayload = { task_id: taskId }
    const customFields: Record<string, FeedbackValue> = {}
    Object.entries(configuration).forEach(([name, field]) => {
      const value = form[name]
      if (!isPresent(value)) return
      const normalized = field.type === 'rating' ? Number(value) : value
      if (field.storage === 'custom') customFields[name] = normalized
      else payload[name] = normalized
    })
    if (Object.keys(customFields).length > 0) payload.custom_fields = customFields

    setLoading(true)
    setError(null)
    try {
      await createFeedback(payload)
      window.dispatchEvent(new CustomEvent(FEEDBACK_SUBMITTED_EVENT, { detail: { taskId, taskType: resolvedTaskType } }))
      onSubmitted()
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const update = (key: string, value: FeedbackValue) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setValidation((previous) => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const renderField = (name: string, field: FeedbackFieldConfiguration[string]) => {
    const value = form[name] ?? ''
    const invalid = validation[name]
    const copy = fieldCopy[name] ?? {}
    const displayLabel = copy.label ?? field.label
    const common = {
      id: `feedback-${name}`,
      className: `form-control${invalid ? ' is-invalid' : ''}`,
      value: Array.isArray(value) ? value.join(', ') : value,
      readOnly,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(name, event.target.value),
    }

    if (field.type === 'rating') {
      const score = Number(value) || 0
      return <div className="col-12 col-md-6" key={name}>
        <div className={`feedback-rating-card h-100${invalid ? ' is-invalid' : ''}`} title={copy.helper ?? `Rate ${displayLabel.toLowerCase()} from poor to excellent.`}>
          <div className="d-flex align-items-start justify-content-between gap-2">
            <div>
              <label className="form-label fw-semibold mb-1" id={`feedback-${name}-label`}>
                {displayLabel}{field.required && !readOnly ? <span className="text-danger ms-1">*</span> : null}
              </label>
              {copy.helper ? <p className="feedback-field-help mb-2">{copy.helper}</p> : null}
            </div>
            <span className={`feedback-rating-status feedback-rating-status-${score}`}>{ratingLabels[score] ?? 'Rated'}</span>
          </div>
          <div className="feedback-stars" role="radiogroup" aria-labelledby={`feedback-${name}-label`}>
            {[1, 2, 3, 4, 5].map((ratingValue) => <button
              type="button"
              role="radio"
              aria-checked={score === ratingValue}
              aria-label={`${ratingValue} out of 5 — ${ratingLabels[ratingValue]}`}
              className={ratingValue <= score ? 'is-selected' : ''}
              disabled={readOnly}
              key={ratingValue}
              onClick={() => update(name, ratingValue)}
              title={`${ratingValue} — ${ratingLabels[ratingValue]}`}
            ><FiStar aria-hidden="true" /></button>)}
          </div>
          {invalid ? <div className="invalid-feedback d-block">{invalid}</div> : null}
        </div>
      </div>
    }

    if (field.type === 'multiselect') {
      const selected = Array.isArray(value) ? value : []
      return <div className="col-12" key={name}>
        <label className="form-label fw-semibold" id={`feedback-${name}-label`}>{displayLabel}</label>
        <div className="feedback-suggestions" role="group" aria-labelledby={`feedback-${name}-label`}>
          {field.options?.map((option) => <button type="button" disabled={readOnly} aria-pressed={selected.includes(option)} className={selected.includes(option) ? 'is-selected' : ''} onClick={() => update(name, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option])} key={option}>{option}</button>)}
        </div>
      </div>
    }

    return <div className={['area_of_improvements', 'strengths', 'recommendations', 'additional_feedback'].includes(name) ? 'col-12' : 'col-12 col-md-6'} key={name}>
      <label className="form-label fw-semibold" htmlFor={`feedback-${name}`}>
        {displayLabel}{field.required && !readOnly ? <span className="text-danger ms-1">*</span> : null}
      </label>
      {field.type === 'select'
        ? <select id={`feedback-${name}`} className={`form-select${invalid ? ' is-invalid' : ''}`} value={String(value)} disabled={readOnly} onChange={(event) => update(name, event.target.value)}>
            <option value="">Choose an option</option>{field.options?.map((option) => <option key={option}>{option}</option>)}
          </select>
        : field.type === 'textarea' || ['area_of_improvements', 'strengths', 'recommendations', 'additional_feedback'].includes(name)
          ? <textarea {...common} rows={3} placeholder={readOnly ? undefined : copy.placeholder} />
          : <input {...common} type={name === 'recording_url' ? 'url' : 'text'} placeholder={readOnly ? undefined : copy.placeholder} />}
      {copy.helper ? <div className="form-text">{copy.helper}</div> : null}
      {name === 'next_action' && !readOnly ? <div className="feedback-suggestions" aria-label="Suggested next actions">
        {nextActionSuggestions.map((suggestion) => <button type="button" className={value === suggestion ? 'is-selected' : ''} onClick={() => update(name, suggestion)} key={suggestion}>{suggestion}</button>)}
      </div> : null}
      {invalid ? <div className="invalid-feedback d-block">{invalid}</div> : null}
    </div>
  }

  const scoreTone = liveScore === null ? 'neutral' : liveScore >= 80 ? 'excellent' : liveScore >= 60 ? 'good' : liveScore >= 40 ? 'developing' : 'attention'
  const scoreMessage = liveScore === null ? 'Begin your assessment' : liveScore >= 80 ? 'Excellent Candidate' : liveScore >= 60 ? 'Good Potential' : liveScore >= 40 ? 'Needs Improvement' : 'Requires Significant Preparation'

  return (
    <div className="modal d-block feedback-modal" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header feedback-modal-header">
            <div><span className="feedback-eyebrow">Performance evaluation</span><h5 className="modal-title mb-1" id="feedback-modal-title">{mode === 'ADD' ? 'Candidate Feedback' : 'Feedback Review'}</h5><p className="text-muted mb-0">{mode === 'ADD' ? 'Your thoughtful evaluation helps every candidate grow.' : 'A structured view of the completed evaluation.'}</p></div>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          {!readOnly && !submitted ? <div className="feedback-progress-wrap">
            <div className="d-flex justify-content-between align-items-center mb-2"><div className="feedback-progress-steps"><span>Information</span><span>Assessment</span><span>Recommendation</span><span>Review</span></div><strong>{completion}%</strong></div>
            <div className="progress" role="progressbar" aria-label="Feedback completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><div className="progress-bar" style={{ width: `${completion}%` }} /></div>
          </div> : null}
          <div className="modal-body feedback-modal-body">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            {submitted ? <div className="feedback-success" role="status"><div className="feedback-success-icon"><FiCheck aria-hidden="true" /></div><span className="feedback-eyebrow">Evaluation complete</span><h3>Feedback Submitted Successfully</h3><p>Thank you! Your thoughtful evaluation will help improve candidate success.</p><button type="button" className="btn btn-primary px-4" onClick={onClose}>Done</button></div> : null}
            {loading && Object.keys(configuration).length === 0 ? <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading feedback…</p></div> : null}
            {!submitted && !loading && Object.keys(configuration).length === 0 ? <div className="alert alert-warning mb-0">Feedback configuration is unavailable for this task type.</div> : null}
            {!submitted && readOnly && !loading ? <FeedbackDetailsContent data={{ ...detailRecord, ...form, task_type: resolvedTaskType, overall }} /> : null}
            {!submitted && !readOnly ? <div className="row g-4">
            <div className={readOnly ? 'col-12' : 'col-12 col-lg-8'}><div className="d-flex flex-column gap-3">
              {Object.entries(sections).map(([section, fields]) => {
                const visibleFields = readOnly ? fields.filter(([name]) => isPresent(form[name])) : fields
                if (visibleFields.length === 0) return null
                const details = sectionDetails[section] ?? { description: 'Provide a clear, constructive evaluation for this area.', icon: FiClipboard }
                const SectionIcon = details.icon
                return <section className="card feedback-section-card" key={section}>
                  <div className="card-body"><div className="feedback-section-heading"><span className="feedback-section-icon"><SectionIcon aria-hidden="true" /></span><div><h6>{section}</h6><p>{details.description}</p></div></div><div className="row g-3">{visibleFields.map(([name, field]) => renderField(name, field))}</div></div>
                </section>
              })}
            </div></div>
            <aside className="col-12 col-lg-4"><div className="feedback-summary">
              <div className="d-flex align-items-center justify-content-between"><div><span className="feedback-eyebrow">Live summary</span><h6 className="mb-0">Evaluation snapshot</h6></div><span className="feedback-save-status"><FiCheckCircle /> Draft ready</span></div>
              <div className={`feedback-score feedback-score-${scoreTone}`} style={{ '--score': `${liveScore ?? 0}%` } as CSSProperties}><div><strong>{liveScore ?? '—'}{liveScore === null ? '' : '%'}</strong><span>Overall</span></div></div>
              <p className="feedback-score-message">{scoreMessage}</p>
              <div className="feedback-summary-ratings">{ratingEntries.map(([name, field]) => {
                const score = Number(form[name]) || 0
                return <div className="feedback-summary-row" key={name}><span>{fieldCopy[name]?.label ?? field.label}</span><span aria-label={`${score} out of 5`}>{[1, 2, 3, 4, 5].map((star) => <FiStar className={star <= score ? 'is-filled' : ''} key={star} />)}</span></div>
              })}</div>
              {isPresent(form.next_action) ? <div className="feedback-summary-recommendation"><span>Recommended next action</span><strong>{String(form.next_action)}</strong></div> : null}
              <div className="feedback-summary-note"><FiInfo /><span>Review your ratings and recommendations before submitting.</span></div>
            </div></aside>
            </div> : null}
          </div>
          {!submitted ? <div className="modal-footer feedback-modal-footer">
            <button type="button" className="btn btn-link text-secondary text-decoration-none" onClick={onClose}><FiX className="me-1" />{readOnly ? 'Close' : 'Cancel'}</button>
            {!readOnly ? <><button type="button" className="btn btn-outline-secondary" disabled title="Draft saving will be available in a future update"><FiSave className="me-2" />Save Draft <span className="badge text-bg-light ms-1">Soon</span></button><button type="button" className="btn btn-primary px-4" onClick={() => void onSubmit()} disabled={loading || Object.keys(configuration).length === 0}>{loading ? 'Submitting…' : <><FiCheckCircle className="me-2" />Submit Feedback</>}</button></> : null}
          </div> : null}
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
