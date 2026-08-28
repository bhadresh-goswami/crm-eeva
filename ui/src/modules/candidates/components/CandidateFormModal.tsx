import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { ClientItem } from '../../clients/api/clientsApi'
import type { CandidateItem } from '../api/candidatesApi'

type CandidateFormState = {
  client_id: string
  name: string
  contact_number: string
  email: string
}

type CandidateFormErrors = Partial<Record<keyof CandidateFormState, string>>

type CandidateFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  candidate: CandidateItem | null
  clients: ClientItem[]
  isSubmitting: boolean
  apiError: string | null
  onClose: () => void
  onSubmit: (payload: {
    id?: number
    client_id: number
    name: string
    contact_number: string
    email?: string
  }) => Promise<void>
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getInitialFormState = (candidate: CandidateItem | null): CandidateFormState => ({
  client_id: candidate?.client_id ? String(candidate.client_id) : '',
  name: candidate?.name ?? '',
  contact_number: candidate?.contact_number ?? '',
  email: candidate?.email ?? '',
})

const validateCandidateForm = (form: CandidateFormState): CandidateFormErrors => {
  const errors: CandidateFormErrors = {}

  if (!form.client_id.trim()) {
    errors.client_id = 'Client is required'
  }

  if (!form.name.trim()) {
    errors.name = 'Name is required'
  }

  if (!form.contact_number.trim()) {
    errors.contact_number = 'Contact number is required'
  }

  if (form.email.trim() && !emailRegex.test(form.email.trim())) {
    errors.email = 'Invalid email format'
  }

  return errors
}

const CandidateFormModal = ({
  isOpen,
  mode,
  candidate,
  clients,
  isSubmitting,
  apiError,
  onClose,
  onSubmit,
}: CandidateFormModalProps) => {
  const [form, setForm] = useState<CandidateFormState>(getInitialFormState(candidate))
  const [errors, setErrors] = useState<CandidateFormErrors>({})

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])
  const hasRequiredFields = Boolean(form.client_id.trim() && form.name.trim() && form.contact_number.trim())

  useEffect(() => {
    if (isOpen) {
      setForm(getInitialFormState(candidate))
      setErrors({})
    }
  }, [candidate, isOpen, mode])

  if (!isOpen) {
    return null
  }

  const closeModal = () => {
    setForm(getInitialFormState(candidate))
    setErrors({})
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateCandidateForm(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({
      id: candidate?.id,
      client_id: Number(form.client_id),
      name: form.name.trim(),
      contact_number: form.contact_number.trim(),
      email: form.email.trim() || undefined,
    })
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={closeModal}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="candidate-form-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="candidate-form-title" className="modal-title">
          {mode === 'create' ? 'Create Candidate' : 'Update Candidate'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="candidateClientId">
            Client
            <select
              id="candidateClientId"
              className={errors.client_id ? 'field-error' : undefined}
              value={form.client_id}
              onChange={(event) => {
                setForm((current) => ({ ...current, client_id: event.target.value }))
                setErrors((current) => ({ ...current, client_id: undefined }))
              }}
              disabled={isSubmitting}
              required
            >
              <option value="">Select client</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name ? `${client.name} (${client.company_name})` : client.name}
                </option>
              ))}
            </select>
            {errors.client_id ? <span className="auth-card__error">{errors.client_id}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="candidateName">
            Name *
            <input
              id="candidateName"
              className={errors.name ? 'field-error' : undefined}
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }))
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              disabled={isSubmitting}
            />
            {errors.name ? <span className="auth-card__error">{errors.name}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="candidateContact">
            Contact Number *
            <input
              id="candidateContact"
              className={errors.contact_number ? 'field-error' : undefined}
              value={form.contact_number}
              onChange={(event) => {
                setForm((current) => ({ ...current, contact_number: event.target.value }))
                setErrors((current) => ({ ...current, contact_number: undefined }))
              }}
              disabled={isSubmitting}
            />
            {errors.contact_number ? <span className="auth-card__error">{errors.contact_number}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="candidateEmail">
            Email
            <input
              id="candidateEmail"
              className={errors.email ? 'field-error' : undefined}
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }))
                setErrors((current) => ({ ...current, email: undefined }))
              }}
              disabled={isSubmitting}
            />
            {errors.email ? <span className="auth-card__error">{errors.email}</span> : null}
          </label>

          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={closeModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting || !hasRequiredFields}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Candidate' : 'Update Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CandidateFormModal
