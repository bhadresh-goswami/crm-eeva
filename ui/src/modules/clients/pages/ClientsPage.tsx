import { useCallback, useEffect, useMemo, useState } from 'react'
import ClientFormModal from '../components/ClientFormModal'
import ClientsTable from '../components/ClientsTable'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  createClient,
  deleteClient,
  getClients,
  toggleClientStatus,
  updateClient,
  type BillingType,
  type ClientItem,
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

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">Client Management</h2>
          <p className="page-description">Modern client CRM with advanced filters, sorting, pagination and modal CRUD.</p>
        </div>
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

      <ClientFormModal
        key={`client-form-${formMode}-${selectedClient?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        client={selectedClient}
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
    </section>
  )
}

export default ClientsPage
