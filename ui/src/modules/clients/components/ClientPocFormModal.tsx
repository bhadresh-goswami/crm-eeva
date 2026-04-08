import { useState, type FormEvent } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import type { ClientItem } from '../api/clientsApi'
import type { PocItem } from '../../pocs/api/pocApi'

type ClientPocFormModalProps = {
  isOpen: boolean
  mode: 'client-create' | 'client-edit' | 'poc-create' | 'poc-edit'
  clients: ClientItem[]
  selectedClient: ClientItem | null
  selectedPoc: PocItem | null
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (payload: {
    id?: number
    client_id?: number
    name: string
    email?: string
    mobile?: string
  }) => Promise<void>
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ClientPocFormModal = ({
  isOpen,
  mode,
  clients,
  selectedClient,
  selectedPoc,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ClientPocFormModalProps) => {
  const [name, setName] = useState(mode.includes('client') ? selectedClient?.name ?? '' : selectedPoc?.name ?? '')
  const [email, setEmail] = useState(selectedPoc?.email ?? '')
  const [mobile, setMobile] = useState(selectedPoc?.mobile ?? '')
  const [clientId, setClientId] = useState(String(selectedPoc?.client_id ?? selectedClient?.id ?? clients[0]?.id ?? ''))
  const [localError, setLocalError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const isClientMode = mode.startsWith('client')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)

    if (!name.trim()) {
      setLocalError(isClientMode ? 'Client name is required.' : 'POC name is required.')
      return
    }

    if (!isClientMode) {
      if (!clientId) {
        setLocalError('Please select client.')
        return
      }

      if (!email.trim()) {
        setLocalError('POC email is required.')
        return
      }

      if (!emailRegex.test(email.trim())) {
        setLocalError('Please enter a valid email address.')
        return
      }

      if (!mobile.trim()) {
        setLocalError('POC mobile is required.')
        return
      }
    }

    await onSubmit({
      id: isClientMode ? selectedClient?.id : selectedPoc?.id,
      client_id: isClientMode ? undefined : Number(clientId),
      name: name.trim(),
      email: isClientMode ? undefined : email.trim(),
      mobile: isClientMode ? undefined : mobile.trim(),
    })
  }

  const titleMap = {
    'client-create': 'Add Client',
    'client-edit': 'Edit Client',
    'poc-create': 'Add POC',
    'poc-edit': 'Edit POC',
  } as const

  return (
    <AnimatedModal isOpen={isOpen} title={titleMap[mode]} onClose={onClose}>
      <h3 className="modal-title">{titleMap[mode]}</h3>
      <form className="modal-form" onSubmit={handleSubmit}>
        {!isClientMode ? (
          <label className="auth-card__field" htmlFor="pocClientSelect">
            Client
            <select id="pocClientSelect" value={clientId} onChange={(event) => setClientId(event.target.value)} disabled={isSubmitting}>
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="auth-card__field" htmlFor="entityName">
          {isClientMode ? 'Client name' : 'POC name'}
          <input id="entityName" value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
        </label>

        {!isClientMode ? (
          <>
            <label className="auth-card__field" htmlFor="entityEmail">
              Email
              <input id="entityEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
            </label>
            <label className="auth-card__field" htmlFor="entityMobile">
              Mobile
              <input id="entityMobile" value={mobile} onChange={(event) => setMobile(event.target.value)} disabled={isSubmitting} />
            </label>
          </>
        ) : null}

        {localError ? <p className="auth-card__error">{localError}</p> : null}
        {error ? <p className="auth-card__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="button button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </AnimatedModal>
  )
}

export default ClientPocFormModal
