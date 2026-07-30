import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  createFeedback,
  getFeedbackByTaskId,
  getFeedbackConfiguration,
  type FeedbackFieldConfiguration,
  type FeedbackPayload,
  type FeedbackRecord,
  type FeedbackValue,
} from '../api/feedbackApi'

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

const FeedbackModal = ({ open, mode, taskId, taskType = '', onClose, onSubmitted }: Props) => {
  const [form, setForm] = useState<Record<string, FeedbackValue>>({})
  const [configuration, setConfiguration] = useState<FeedbackFieldConfiguration>({})
  const [resolvedTaskType, setResolvedTaskType] = useState(taskType)
  const [overall, setOverall] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open || !taskId) return

    setError(null)
    setValidation({})
    setOverall(null)
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
      onSubmitted()
      onClose()
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
    const common = {
      id: `feedback-${name}`,
      className: `form-control${invalid ? ' is-invalid' : ''}`,
      value,
      readOnly,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(name, event.target.value),
    }

    return <div className={field.type === 'rating' ? 'col-12 col-sm-6 col-lg-4' : 'col-12 col-md-6'} key={name}>
      <label className="form-label fw-semibold" htmlFor={`feedback-${name}`}>
        {field.label}{field.required && !readOnly ? <span className="text-danger ms-1">*</span> : null}
      </label>
      {field.type === 'select'
        ? <select id={`feedback-${name}`} className={`form-select${invalid ? ' is-invalid' : ''}`} value={String(value)} disabled={readOnly} onChange={(event) => update(name, event.target.value)}>
            <option value="">Select</option>{field.options?.map((option) => <option key={option}>{option}</option>)}
          </select>
        : field.type === 'rating'
          ? <div className="input-group"><input {...common} type="number" min={field.min} max={field.max} step="1" /><span className="input-group-text text-muted">/ {field.max ?? 5}</span></div>
          : ['area_of_improvements', 'strengths', 'recommendations', 'additional_feedback'].includes(name)
            ? <textarea {...common} rows={3} />
            : <input {...common} type={name === 'recording_url' ? 'url' : 'text'} />}
      {invalid ? <div className="invalid-feedback d-block">{invalid}</div> : null}
    </div>
  }

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true" style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-light">
            <div><h5 className="modal-title mb-1">{mode === 'ADD' ? 'Add Feedback' : 'View Feedback'}</h5><span className="badge text-bg-primary">{resolvedTaskType || 'Feedback'}</span></div>
            {readOnly && isPresent(overall) ? <div className="ms-auto me-3 text-end"><small className="text-muted d-block">Overall Score</small><strong className="fs-4 text-primary">{String(overall)}</strong></div> : null}
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body bg-body-tertiary">
            {error ? <div className="alert alert-danger py-2">{error}</div> : null}
            {loading && Object.keys(configuration).length === 0 ? <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2 mb-0">Loading feedback…</p></div> : null}
            {!loading && Object.keys(configuration).length === 0 ? <div className="alert alert-warning mb-0">Feedback configuration is unavailable for this task type.</div> : null}
            <div className="d-flex flex-column gap-3">
              {Object.entries(sections).map(([section, fields]) => {
                const visibleFields = readOnly ? fields.filter(([name]) => isPresent(form[name])) : fields
                if (visibleFields.length === 0) return null
                return <section className="card border-0 shadow-sm" key={section}>
                  <div className="card-body"><h6 className="text-primary border-bottom pb-2 mb-3">{section}</h6><div className="row g-3">{visibleFields.map(([name, field]) => renderField(name, field))}</div></div>
                </section>
              })}
            </div>
          </div>
          <div className="modal-footer bg-white">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            {!readOnly ? <button type="button" className="btn btn-primary px-4" onClick={() => void onSubmit()} disabled={loading || Object.keys(configuration).length === 0}>{loading ? 'Saving…' : 'Submit Feedback'}</button> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackModal
