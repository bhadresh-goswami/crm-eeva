import { useCallback, useEffect, useMemo, useState } from 'react'
import AnimatedModal from '../../../shared/components/AnimatedModal'
import ClientPocFormModal from '../components/ClientPocFormModal'
import ClientPocTable from '../components/ClientPocTable'
import {
  createClient,
  createPoc,
  deleteClient,
  deletePoc,
  getClients,
  toggleClient,
  togglePoc,
  updateClient,
  updatePoc,
  type ClientItem,
  type PocItem,
} from '../api/clientsApi'

type FormMode = 'client-create' | 'client-edit' | 'poc-create' | 'poc-edit'

const ClientsPage = () => {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null)

  const [formMode, setFormMode] = useState<FormMode>('client-create')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null)
  const [selectedPoc, setSelectedPoc] = useState<PocItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'client' | 'poc'; id: number; name: string } | null>(null)

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2400)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await getClients()
      setClients(data)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load clients data.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openModal = (mode: FormMode, client: ClientItem | null = null, poc: PocItem | null = null) => {
    setFormMode(mode)
    setSelectedClient(client)
    setSelectedPoc(poc)
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = useCallback(async (payload: {
    id?: number
    client_id?: number
    name: string
    email?: string
    mobile?: string
  }) => {
    setIsSubmitting(true)
    setFormError(null)

    try {
      if (formMode === 'client-create') {
        await createClient({ name: payload.name })
        showSuccess('Client created successfully.')
      } else if (formMode === 'client-edit') {
        await updateClient({ id: payload.id ?? 0, name: payload.name })
        showSuccess('Client updated successfully.')
      } else if (formMode === 'poc-create') {
        await createPoc({
          client_id: payload.client_id ?? 0,
          name: payload.name,
          email: payload.email ?? '',
          mobile: payload.mobile ?? '',
        })
        showSuccess('POC created successfully.')
      } else {
        await updatePoc({
          id: payload.id ?? 0,
          client_id: payload.client_id ?? 0,
          name: payload.name,
          email: payload.email ?? '',
          mobile: payload.mobile ?? '',
        })
        showSuccess('POC updated successfully.')
      }

      setIsFormOpen(false)
      await loadData()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to save data.'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formMode, loadData, showSuccess])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    setActiveActionKey(`${deleteTarget.type}-${deleteTarget.id}`)

    try {
      if (deleteTarget.type === 'client') {
        await deleteClient(deleteTarget.id)
        showSuccess('Client deleted successfully.')
      } else {
        await deletePoc(deleteTarget.id)
        showSuccess('POC deleted successfully.')
      }

      setDeleteTarget(null)
      await loadData()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete record.'
      setError(message)
    } finally {
      setActiveActionKey(null)
    }
  }, [deleteTarget, loadData, showSuccess])

  const handleToggleClient = useCallback(async (client: ClientItem) => {
    setActiveActionKey(`client-${client.id}`)
    try {
      await toggleClient(client.id)
      showSuccess('Client status updated successfully.')
      await loadData()
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Failed to update status.'
      setError(message)
    } finally {
      setActiveActionKey(null)
    }
  }, [loadData, showSuccess])

  const handleTogglePoc = useCallback(async (poc: PocItem) => {
    setActiveActionKey(`poc-${poc.id}`)
    try {
      await togglePoc(poc.id)
      showSuccess('POC status updated successfully.')
      await loadData()
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : 'Failed to update status.'
      setError(message)
    } finally {
      setActiveActionKey(null)
    }
  }, [loadData, showSuccess])

  const totalPocs = useMemo(() => clients.reduce((count, client) => count + client.pocs.length, 0), [clients])

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">Clients + POC Management</h2>
          <p className="page-description">Modern CRM view with grouped hierarchy, modal CRUD, and smooth transitions.</p>
        </div>
        <div className="dashboard-actions">
          <button className="button button--primary" onClick={() => openModal('client-create')}>
            Add Client
          </button>
          <button className="button" onClick={() => openModal('poc-create')}>
            Add POC
          </button>
        </div>
      </div>

      <div className="cards-grid clients-kpi-grid">
        <article className="card">
          <h3>Total Clients</h3>
          <p className="card-text">{clients.length}</p>
        </article>
        <article className="card">
          <h3>Total POCs</h3>
          <p className="card-text">{totalPocs}</p>
        </article>
      </div>

      {error ? <p className="auth-card__error roles-feedback">{error}</p> : null}
      {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

      <ClientPocTable
        clients={clients}
        isLoading={isLoading}
        activeActionKey={activeActionKey}
        onEditClient={(client) => openModal('client-edit', client)}
        onDeleteClient={(client) => setDeleteTarget({ type: 'client', id: client.id, name: client.name })}
        onToggleClient={handleToggleClient}
        onAddPoc={(client) => openModal('poc-create', client)}
        onEditPoc={(poc) => openModal('poc-edit', clients.find((item) => item.id === poc.client_id) ?? null, poc)}
        onDeletePoc={(poc) => setDeleteTarget({ type: 'poc', id: poc.id, name: poc.name })}
        onTogglePoc={handleTogglePoc}
      />

      <ClientPocFormModal
        key={`${formMode}-${selectedClient?.id ?? selectedPoc?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        clients={clients}
        selectedClient={selectedClient}
        selectedPoc={selectedPoc}
        isSubmitting={isSubmitting}
        error={formError}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <AnimatedModal
        isOpen={Boolean(deleteTarget)}
        title="Delete confirmation"
        onClose={() => {
          if (!activeActionKey) {
            setDeleteTarget(null)
          }
        }}
      >
        <h3 className="modal-title">Delete confirmation</h3>
        <p className="card-text">Are you sure you want to delete?</p>
        <p className="card-text">{deleteTarget?.name}</p>
        <div className="modal-actions">
          <button className="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(activeActionKey)}>
            Cancel
          </button>
          <button className="button button--danger" onClick={() => void handleConfirmDelete()} disabled={Boolean(activeActionKey)}>
            Confirm
          </button>
        </div>
      </AnimatedModal>
    </section>
  )
}

export default ClientsPage
