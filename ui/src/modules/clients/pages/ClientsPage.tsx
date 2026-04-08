import { useCallback, useEffect, useMemo, useState } from 'react'
import ClientFormModal from '../components/ClientFormModal'
import ClientsTable from '../components/ClientsTable'
import ConfirmDialog from '../components/ConfirmDialog'
import PocFormModal from '../components/PocFormModal'
import PocsTable from '../components/PocsTable'
import {
  createClient,
  createPoc,
  deleteClient,
  deletePoc,
  getClients,
  toggleClientStatus,
  togglePocStatus,
  updateClient,
  updatePoc,
  type BillingType,
  type ClientItem,
  type PocItem,
} from '../api/clientsApi'

const ClientsPage = () => {
  const [clients, setClients] = useState<ClientItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionClientId, setActionClientId] = useState<number | null>(null)
  const [actionPocId, setActionPocId] = useState<number | null>(null)
  const [isPocFormOpen, setIsPocFormOpen] = useState(false)
  const [pocFormMode, setPocFormMode] = useState<'create' | 'edit'>('create')
  const [selectedPoc, setSelectedPoc] = useState<PocItem | null>(null)
  const [deletePocTarget, setDeletePocTarget] = useState<PocItem | null>(null)
  const [pocModalError, setPocModalError] = useState<string | null>(null)
  const [search, setSearch] = useState(window.location.search)

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2500)
  }, [])

  const loadClients = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const response = await getClients()
      setClients(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load clients.'
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  useEffect(() => {
    const onPopState = () => setSearch(window.location.search)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleSubmit = useCallback(async (payload: {
    id?: number
    name: string
    company_name: string
    mobile: string
    address: string
    gst: string
    billing_type: BillingType
  }) => {
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (formMode === 'create') {
        await createClient(payload)
        showSuccess('Client created successfully.')
      } else {
        await updateClient({
          id: payload.id ?? 0,
          name: payload.name,
          company_name: payload.company_name,
          mobile: payload.mobile,
          address: payload.address,
          gst: payload.gst,
          billing_type: payload.billing_type,
        })
        showSuccess('Client updated successfully.')
      }

      setIsFormOpen(false)
      setSelectedClient(null)
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save client.'
      setModalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formMode, loadClients, showSuccess])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    setActionClientId(deleteTarget.id)
    setPageError(null)

    try {
      await deleteClient(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('Client deleted successfully.')
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete client.'
      setPageError(message)
    } finally {
      setActionClientId(null)
    }
  }, [deleteTarget, loadClients, showSuccess])

  const handleToggle = useCallback(async (client: ClientItem) => {
    setActionClientId(client.id)
    setPageError(null)

    try {
      await toggleClientStatus(client.id)
      showSuccess('Client status updated successfully.')
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update client status.'
      setPageError(message)
    } finally {
      setActionClientId(null)
    }
  }, [loadClients, showSuccess])

  const totalActive = useMemo(
    () => clients.filter((item) => item.status.toLowerCase() === 'active').length,
    [clients],
  )

  const existingCompanyNames = useMemo(() => {
    const editingId = formMode === 'edit' ? selectedClient?.id : null
    return clients
      .filter((item) => item.id !== editingId)
      .map((item) => item.company_name)
      .filter((item) => item.trim().length > 0)
  }, [clients, formMode, selectedClient?.id])

  const pocs = useMemo(
    () =>
      clients.flatMap((client) =>
        client.pocs.map((poc) => ({ ...poc, client_name: poc.client_name || client.name, client_id: poc.client_id || client.id })),
      ),
    [clients],
  )

  const isPocTab = new URLSearchParams(search).get('tab') === 'poc'

  const navigateTab = (to: string) => {
    window.history.pushState({}, '', to)
    setSearch(window.location.search)
  }

  const handlePocSubmit = useCallback(async (payload: {
    id?: number
    client_id: number
    name: string
    email: string
    mobile: string
  }) => {
    setIsSubmitting(true)
    setPocModalError(null)
    try {
      if (pocFormMode === 'create') {
        await createPoc(payload)
        showSuccess('POC created successfully.')
      } else {
        await updatePoc({
          id: payload.id ?? 0,
          client_id: payload.client_id,
          name: payload.name,
          email: payload.email,
          mobile: payload.mobile,
        })
        showSuccess('POC updated successfully.')
      }
      setIsPocFormOpen(false)
      setSelectedPoc(null)
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save POC.'
      setPocModalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [loadClients, pocFormMode, showSuccess])

  const handleDeletePoc = useCallback(async () => {
    if (!deletePocTarget) {
      return
    }
    setActionPocId(deletePocTarget.id)
    try {
      await deletePoc(deletePocTarget.id)
      setDeletePocTarget(null)
      showSuccess('POC deleted successfully.')
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete POC.'
      setPageError(message)
    } finally {
      setActionPocId(null)
    }
  }, [deletePocTarget, loadClients, showSuccess])

  const handleTogglePoc = useCallback(async (poc: PocItem) => {
    setActionPocId(poc.id)
    try {
      await togglePocStatus(poc.id)
      showSuccess('POC status updated successfully.')
      await loadClients()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update POC status.'
      setPageError(message)
    } finally {
      setActionPocId(null)
    }
  }, [loadClients, showSuccess])

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">{isPocTab ? 'POC Management' : 'Client Management'}</h2>
          <p className="page-description">Modern CRM with advanced filters, sorting, pagination and modal CRUD.</p>
        </div>
        {isPocTab ? (
          <button className="button button--primary" onClick={() => { setPocFormMode('create'); setSelectedPoc(null); setPocModalError(null); setIsPocFormOpen(true) }}>
            Create POC
          </button>
        ) : (
          <button
            className="button button--primary"
            onClick={() => {
              setFormMode('create')
              setSelectedClient(null)
              setModalError(null)
              setIsFormOpen(true)
            }}
          >
            Create Client
          </button>
        )}
      </div>

      <div className="roles-pagination__actions" style={{ marginBottom: '0.75rem' }}>
        <button className={isPocTab ? 'button' : 'button button--primary'} onClick={() => navigateTab('/clients')}>Clients</button>
        <button className={isPocTab ? 'button button--primary' : 'button'} onClick={() => navigateTab('/clients?tab=poc')}>POC</button>
      </div>

      <div className="cards-grid clients-kpi-grid">
        <article className="card">
          <h3>Total Clients</h3>
          <p className="card-text">{clients.length}</p>
        </article>
        <article className="card">
          <h3>Active Clients</h3>
          <p className="card-text">{totalActive}</p>
        </article>
      </div>

      {pageError ? <p className="auth-card__error roles-feedback">{pageError}</p> : null}
      {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

      {isPocTab ? (
        <PocsTable
          pocs={pocs}
          isLoading={isLoading}
          activePocId={actionPocId}
          onEdit={(poc) => {
            setPocFormMode('edit')
            setSelectedPoc(poc)
            setPocModalError(null)
            setIsPocFormOpen(true)
          }}
          onDelete={setDeletePocTarget}
          onToggle={handleTogglePoc}
        />
      ) : (
        <ClientsTable
          clients={clients}
          isLoading={isLoading}
          activeClientId={actionClientId}
          onEdit={(client) => {
            setFormMode('edit')
            setSelectedClient(client)
            setModalError(null)
            setIsFormOpen(true)
          }}
          onDelete={setDeleteTarget}
          onToggle={handleToggle}
        />
      )}

      <ClientFormModal
        key={`client-form-${formMode}-${selectedClient?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        client={selectedClient}
        existingCompanyNames={existingCompanyNames}
        apiError={modalError}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsFormOpen(false)
          setModalError(null)
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Client"
        message="Are you sure you want to delete?"
        isLoading={actionClientId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <PocFormModal
        key={`${pocFormMode}-${selectedPoc?.id ?? 'new'}-${isPocFormOpen ? 'open' : 'closed'}`}
        isOpen={isPocFormOpen}
        mode={pocFormMode}
        poc={selectedPoc}
        clients={clients}
        isSubmitting={isSubmitting}
        apiError={pocModalError}
        onClose={() => {
          setIsPocFormOpen(false)
          setPocModalError(null)
        }}
        onSubmit={handlePocSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deletePocTarget)}
        title="Delete POC"
        message="Are you sure you want to delete this POC?"
        isLoading={actionPocId === deletePocTarget?.id}
        onCancel={() => setDeletePocTarget(null)}
        onConfirm={() => void handleDeletePoc()}
      />
    </section>
  )
}

export default ClientsPage
