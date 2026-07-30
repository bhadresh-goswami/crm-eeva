import { useState, type FormEvent } from 'react'
import type { ClientItem, PocItem } from '../api/clientsApi'

type PocFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  poc: PocItem | null
  clients: ClientItem[]
  isSubmitting: boolean
  apiError: string | null
  onClose: () => void
  onSubmit: (payload: {
    id?: number
    client_id: number
    name: string
    email: string
    mobile: string
  }) => Promise<void>
}

const PocFormModal = ({ isOpen, mode, poc, clients, isSubmitting, apiError, onClose, onSubmit }: PocFormModalProps) => {
  const [clientId, setClientId] = useState(String(poc?.client_id ?? clients[0]?.id ?? ''))
  const [name, setName] = useState(poc?.name ?? '')
  const [email, setEmail] = useState(poc?.email ?? '')
  const [mobile, setMobile] = useState(poc?.mobile ?? '')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('POC name is required.')
      return
    }

    if (!clientId) {
      setError('Client is required.')
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
        <h3 id="poc-form-title" className="modal-title">{mode === 'create' ? 'Create POC' : 'Update POC'}</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="pocClientId">
            Client
            <select id="pocClientId" value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting}>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>

          <label className="auth-card__field" htmlFor="pocName">
            POC Name
            <input id="pocName" value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="pocEmail">
            Email
            <input id="pocEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="pocMobile">
            Mobile
            <input id="pocMobile" value={mobile} onChange={(event) => setMobile(event.target.value)} disabled={isSubmitting} />
          </label>

          {error ? <p className="auth-card__error">{error}</p> : null}
          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PocFormModal
