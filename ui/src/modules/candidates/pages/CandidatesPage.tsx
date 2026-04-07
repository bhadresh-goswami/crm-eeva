import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { getClients, type ClientItem } from '../../clients/api/clientsApi'
import {
  createCandidate,
  deleteCandidate,
  getCandidates,
  updateCandidate,
  type CandidateItem,
} from '../api/candidatesApi'
import CandidateFormModal from '../components/CandidateFormModal'
import CandidatesTable from '../components/CandidatesTable'
import ConfirmDialog from '../components/ConfirmDialog'

const CandidatesPage = () => {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState<CandidateItem[]>([])
  const [clients, setClients] = useState<ClientItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CandidateItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionCandidateId, setActionCandidateId] = useState<number | null>(null)

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2500)
  }, [])

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const [candidatesData, clientsData] = await Promise.all([getCandidates(), getClients()])
      const clientsById = new Map(clientsData.map((client) => [client.id, client.name]))
      setCandidates(
        candidatesData.map((candidate) => ({
          ...candidate,
          client_name: candidate.client_name || (candidate.client_id ? clientsById.get(candidate.client_id) ?? '' : ''),
        })),
      )
      setClients(clientsData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load candidates data.'
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const isDuplicateCandidate = useCallback((payload: {
    id?: number
    client_id?: number
    name: string
    contact_number: string
  }) => {
    const normalizedName = payload.name.trim().toLowerCase()
    const normalizedContact = payload.contact_number.trim().toLowerCase()
    const normalizedClientId = payload.client_id ?? null

    return candidates.some((item) => {
      if (payload.id && item.id === payload.id) {
        return false
      }

      return (
        item.name.trim().toLowerCase() === normalizedName &&
        item.contact_number.trim().toLowerCase() === normalizedContact &&
        (item.client_id ?? null) === normalizedClientId
      )
    })
  }, [candidates])

  const handleSubmit = useCallback(async (payload: {
    id?: number
    client_id?: number
    name: string
    contact_number: string
    email?: string
  }) => {
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (isDuplicateCandidate(payload)) {
        setModalError('Candidate already exists')
        return
      }

      if (formMode === 'create') {
        await createCandidate(payload)
        showSuccess('Candidate created successfully.')
      } else {
        await updateCandidate({
          id: payload.id ?? 0,
          client_id: payload.client_id,
          name: payload.name,
          contact_number: payload.contact_number,
          email: payload.email,
        })
        showSuccess('Candidate updated successfully.')
      }

      setIsFormOpen(false)
      setSelectedCandidate(null)
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save candidate.'
      setModalError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [formMode, isDuplicateCandidate, loadPageData, showSuccess])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    setActionCandidateId(deleteTarget.id)
    setPageError(null)

    try {
      await deleteCandidate(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('Candidate deleted successfully.')
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete candidate.'
      setPageError(message)
    } finally {
      setActionCandidateId(null)
    }
  }, [deleteTarget, loadPageData, showSuccess])

  const linkedCandidates = useMemo(() => candidates.filter((candidate) => candidate.client_id).length, [candidates])

  if (!user) {
    return <Navigate replace to="/login" />
  }

  if (!['admin', 'manager', 'coordinator'].includes(user.role)) {
    return <Navigate replace to="/dashboard" />
  }

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">Candidate Management</h2>
          <p className="page-description">Manage candidates with validation, duplicate prevention and modal CRUD.</p>
        </div>
        <button
          className="button button--primary"
          onClick={() => {
            setFormMode('create')
            setSelectedCandidate(null)
            setModalError(null)
            setIsFormOpen(true)
          }}
        >
          Create Candidate
        </button>
      </div>

      <div className="cards-grid clients-kpi-grid">
        <article className="card">
          <h3>Total Candidates</h3>
          <p className="card-text">{candidates.length}</p>
        </article>
        <article className="card">
          <h3>Client Linked</h3>
          <p className="card-text">{linkedCandidates}</p>
        </article>
      </div>

      {pageError ? <p className="auth-card__error roles-feedback">{pageError}</p> : null}
      {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

      <CandidatesTable
        candidates={candidates}
        isLoading={isLoading}
        activeCandidateId={actionCandidateId}
        onEdit={(candidate) => {
          setFormMode('edit')
          setSelectedCandidate(candidate)
          setModalError(null)
          setIsFormOpen(true)
        }}
        onDelete={setDeleteTarget}
      />

      <CandidateFormModal
        key={`${formMode}-${selectedCandidate?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        candidate={selectedCandidate}
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
        title="Delete Candidate"
        message="Are you sure you want to delete?"
        isLoading={actionCandidateId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}

export default CandidatesPage
