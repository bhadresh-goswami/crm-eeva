import { useCallback, useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import PocFormModal from '../components/PocFormModal'
import PocsTable from '../components/PocsTable'
import {
  createPoc,
  deletePoc,
  getClientOptions,
  getPocs,
  togglePocStatus,
  updatePoc,
  type ClientOption,
  type PocItem,
} from '../api/pocApi'

const PocsPage = () => {
  const [pocs, setPocs] = useState<PocItem[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedPoc, setSelectedPoc] = useState<PocItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PocItem | null>(null)
  const [actionPocId, setActionPocId] = useState<number | null>(null)

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2500)
  }, [])

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const [pocData, clientData] = await Promise.all([getPocs(), getClientOptions()])
      setPocs(pocData)
      setClients(clientData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load POCs data.'
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const openCreateModal = useCallback(() => {
    setFormMode('create')
    setSelectedPoc(null)
    setModalError(null)
    setIsFormOpen(true)
  }, [])

  const openEditModal = useCallback((poc: PocItem) => {
    setFormMode('edit')
    setSelectedPoc(poc)
    setModalError(null)
    setIsFormOpen(true)
  }, [])

  const handleSubmit = useCallback(async (payload: { id?: number; client_id: number; name: string; email: string; mobile: string }) => {
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (formMode === 'create') {
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

      setIsFormOpen(false)
      setSelectedPoc(null)
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save POC.'
      setModalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formMode, loadPageData, showSuccess])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    setActionPocId(deleteTarget.id)
    setPageError(null)

    try {
      await deletePoc(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('POC deleted successfully.')
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete POC.'
      setPageError(message)
    } finally {
      setActionPocId(null)
    }
  }, [deleteTarget, loadPageData, showSuccess])

  const handleToggle = useCallback(async (poc: PocItem) => {
    setActionPocId(poc.id)
    setPageError(null)

    try {
      await togglePocStatus(poc.id)
      showSuccess('POC status updated successfully.')
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update POC status.'
      setPageError(message)
    } finally {
      setActionPocId(null)
    }
  }, [loadPageData, showSuccess])

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">POC Management</h2>
          <p className="page-description">Manage client points of contact with modal CRUD and smart table controls.</p>
        </div>
        <button className="button button--primary" onClick={openCreateModal}>
          Create POC
        </button>
      </div>

      {pageError ? <p className="auth-card__error roles-feedback">{pageError}</p> : null}
      {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

      <PocsTable
        pocs={pocs}
        clients={clients}
        isLoading={isLoading}
        activePocId={actionPocId}
        onEdit={openEditModal}
        onDelete={setDeleteTarget}
        onToggle={handleToggle}
      />

      <PocFormModal
        key={`${formMode}-${selectedPoc?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        poc={selectedPoc}
        clients={clients}
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
        title="Delete POC"
        message="Are you sure you want to delete this POC?"
        isLoading={actionPocId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}

export default PocsPage
