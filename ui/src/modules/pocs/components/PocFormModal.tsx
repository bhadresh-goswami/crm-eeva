import { useMemo, useState, type FormEvent } from 'react'
import type { ClientOption, PocItem } from '../api/pocApi'

type PocFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  poc: PocItem | null
  clients: ClientOption[]
  isSubmitting: boolean
  apiError: string | null
  onClose: () => void
  onSubmit: (payload: { id?: number; client_id: number; name: string; email: string; mobile: string }) => Promise<void>
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PocFormModal = ({ isOpen, mode, poc, clients, isSubmitting, apiError, onClose, onSubmit }: PocFormModalProps) => {
  const [clientId, setClientId] = useState(poc?.client_id ? String(poc.client_id) : '')
  const [name, setName] = useState(poc?.name ?? '')
  const [email, setEmail] = useState(poc?.email ?? '')
  const [mobile, setMobile] = useState(poc?.mobile ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hasClients = useMemo(() => clients.length > 0, [clients.length])

  if (!isOpen) {
    return null
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!clientId) {
      nextErrors.client_id = 'Client is required.'
    }

    if (!name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!mobile.trim()) {
      nextErrors.mobile = 'Mobile is required.'
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
      id: poc?.id,
      client_id: Number(clientId),
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
    })
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="poc-form-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="poc-form-title" className="modal-title">
          {mode === 'create' ? 'Create POC' : 'Update POC'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="pocClient">
            Client *
            <select id="pocClient" value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting || !hasClients}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id ? <span className="auth-card__error">{errors.client_id}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="pocName">
            Name *
            <input id="pocName" value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
            {errors.name ? <span className="auth-card__error">{errors.name}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="pocEmail">
            Email *
            <input id="pocEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
            {errors.email ? <span className="auth-card__error">{errors.email}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="pocMobile">
            Mobile *
            <input id="pocMobile" value={mobile} onChange={(event) => setMobile(event.target.value)} disabled={isSubmitting} />
            {errors.mobile ? <span className="auth-card__error">{errors.mobile}</span> : null}
          </label>

          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting || !hasClients}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create POC' : 'Update POC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PocFormModal
