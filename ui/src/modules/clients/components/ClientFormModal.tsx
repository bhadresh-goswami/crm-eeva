import { useState, type FormEvent } from 'react'
import type { BillingType, ClientItem } from '../api/clientsApi'

type ClientFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  client: ClientItem | null
  existingCompanyNames: string[]
  isSubmitting: boolean
  apiError: string | null
  onClose: () => void
  onSubmit: (payload: {
    id?: number
    name: string
    company_name: string
    mobile: string
    address: string
    gst: string
    billing_type: BillingType
  }) => Promise<void>
}

const billingOptions: BillingType[] = ['gst', 'tds', 'personal', 'usa', 'cash']

const ClientFormModal = ({
  isOpen,
  mode,
  client,
  existingCompanyNames,
  isSubmitting,
  apiError,
  onClose,
  onSubmit,
}: ClientFormModalProps) => {
  const [name, setName] = useState(client?.name ?? '')
  const [companyName, setCompanyName] = useState(client?.company_name ?? '')
  const [mobile, setMobile] = useState(client?.mobile ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [gst, setGst] = useState(client?.gst ?? '')
  const [billingType, setBillingType] = useState<BillingType>(client?.billing_type ?? 'personal')
  const [localError, setLocalError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setFieldErrors({})

    if (!name.trim()) {
      setLocalError('Name is required.')
      return
    }

    const normalizedCompanyName = companyName.trim().toLowerCase()
    const hasDuplicateCompany =
      normalizedCompanyName.length > 0 && existingCompanyNames.map((item) => item.trim().toLowerCase()).includes(normalizedCompanyName)

    if (hasDuplicateCompany) {
      setFieldErrors({ company_name: 'Client company already exists' })
      return
    }

    await onSubmit({
      id: client?.id,
      name: name.trim(),
      company_name: companyName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      gst: gst.trim(),
      billing_type: billingType,
    })
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="client-form-title" onClick={(event) => event.stopPropagation()}>
        <h3 id="client-form-title" className="modal-title">
          {mode === 'create' ? 'Create Client' : 'Update Client'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="clientName">
            Name *
            <input id="clientName" value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="clientCompanyName">
            Company Name
            <input
              id="clientCompanyName"
              className={fieldErrors.company_name ? 'auth-input--error' : ''}
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.company_name ? <span className="auth-card__error">{fieldErrors.company_name}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="clientMobile">
            Mobile
            <input id="clientMobile" value={mobile} onChange={(event) => setMobile(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="clientAddress">
            Address
            <input id="clientAddress" value={address} onChange={(event) => setAddress(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="clientGst">
            GST
            <input id="clientGst" value={gst} onChange={(event) => setGst(event.target.value)} disabled={isSubmitting} />
          </label>

          <label className="auth-card__field" htmlFor="clientBillingType">
            Billing Type
            <select
              id="clientBillingType"
              value={billingType}
              onChange={(event) => setBillingType(event.target.value as BillingType)}
              disabled={isSubmitting}
            >
              {billingOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          {localError ? <p className="auth-card__error">{localError}</p> : null}
          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientFormModal
