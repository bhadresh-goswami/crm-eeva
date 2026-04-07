import { useMemo, useState, type FormEvent } from 'react'
import type { ClientItem } from '../../clients/api/clientsApi'
import type { CandidateItem } from '../api/candidatesApi'

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
    client_id?: number
    name: string
    contact_number: string
    email?: string
  }) => Promise<void>
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const [clientId, setClientId] = useState(candidate?.client_id ? String(candidate.client_id) : '')
  const [name, setName] = useState(candidate?.name ?? '')
  const [contactNumber, setContactNumber] = useState(candidate?.contact_number ?? '')
  const [email, setEmail] = useState(candidate?.email ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients])

  if (!isOpen) {
    return null
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!contactNumber.trim()) {
      nextErrors.contact_number = 'Contact number is required.'
    }

    if (email.trim() && !emailRegex.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onSubmit({
      id: candidate?.id,
      client_id: clientId ? Number(clientId) : undefined,
      name: name.trim(),
      contact_number: contactNumber.trim(),
      email: email.trim() || undefined,
    })
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="candidate-form-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="candidate-form-title" className="modal-title">
          {mode === 'create' ? 'Create Candidate' : 'Update Candidate'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="candidateClientId">
            Client
            <select
              id="candidateClientId"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select client (optional)</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-card__field" htmlFor="candidateName">
            Name *
            <input
              id="candidateName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
            {errors.name ? <span className="auth-card__error">{errors.name}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="candidateContact">
            Contact Number *
            <input
              id="candidateContact"
              value={contactNumber}
              onChange={(event) => setContactNumber(event.target.value)}
              disabled={isSubmitting}
            />
            {errors.contact_number ? <span className="auth-card__error">{errors.contact_number}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="candidateEmail">
            Email
            <input
              id="candidateEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
            {errors.email ? <span className="auth-card__error">{errors.email}</span> : null}
          </label>

          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Candidate' : 'Update Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CandidateFormModal
