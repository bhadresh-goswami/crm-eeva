import { useMemo, useState } from 'react'
import type { CandidateItem } from '../api/candidatesApi'

type SortField = 'name' | 'contact_number'
type SortOrder = 'asc' | 'desc'

type CandidateTableItem = CandidateItem & {
  client_company_name: string
  client_display_name: string
}

type CandidatesTableProps = {
  candidates: CandidateTableItem[]
  isLoading: boolean
  activeCandidateId: number | null
  onEdit: (candidate: CandidateTableItem) => void
  onDelete: (candidate: CandidateTableItem) => void
}

const PAGE_SIZE = 10

const CandidatesTable = ({ candidates, isLoading, activeCandidateId, onEdit, onDelete }: CandidatesTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const clientOptions = useMemo(() => {
    return [...new Set(candidates.map((item) => item.client_display_name).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const matchesSearch =
        !normalizedSearch ||
        candidate.name.toLowerCase().includes(normalizedSearch) ||
        candidate.contact_number.toLowerCase().includes(normalizedSearch) ||
        candidate.client_name.toLowerCase().includes(normalizedSearch) ||
        candidate.client_company_name.toLowerCase().includes(normalizedSearch)

      const matchesClient = clientFilter === 'all' || candidate.client_display_name === clientFilter

      return matchesSearch && matchesClient
    })
  }, [candidates, clientFilter, searchTerm])

  const filteredAndSorted = useMemo(() => {
    return [...filteredCandidates].sort((left, right) => {
      const leftValue = String(left[sortField] ?? '').toLowerCase()
      const rightValue = String(right[sortField] ?? '').toLowerCase()
      const compared = leftValue.localeCompare(rightValue)
      return sortOrder === 'asc' ? compared : -compared
    })
  }, [filteredCandidates, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)

  const paginatedCandidates = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredAndSorted.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredAndSorted])

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages])

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return '↕'
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const handleSort = (field: SortField) => {
    setCurrentPage(1)

    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortOrder('asc')
  }

  if (isLoading) {
    return (
      <div className="card users-loader">
        <p className="card-text">Loading candidates...</p>
      </div>
    )
  }

  return (
    <>
      <div className="card candidates-controls">
        <label className="auth-card__field" htmlFor="candidatesSearch">
          Search
          <input
            id="candidatesSearch"
            placeholder="Search by name or contact"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label className="auth-card__field" htmlFor="candidatesClientFilter">
          Client
          <select
            id="candidatesClientFilter"
            value={clientFilter}
            onChange={(event) => {
              setClientFilter(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All clients</option>
            {clientOptions.map((clientName) => (
              <option key={clientName} value={clientName}>
                {clientName}
              </option>
            ))}
          </select>
        </label>

        <button
          className="button"
          onClick={() => {
            setSearchTerm('')
            setClientFilter('all')
            setCurrentPage(1)
          }}
        >
          Clear filter
        </button>
      </div>

      <div className="card clients-table__wrapper users-table__fade">
        <table className="roles-table clients-table">
          <thead>
            <tr>
              <th>
                <button className="table-sort" onClick={() => handleSort('name')}>
                  Name {sortIndicator('name')}
                </button>
              </th>
              <th>
                <button className="table-sort" onClick={() => handleSort('contact_number')}>
                  Contact Number {sortIndicator('contact_number')}
                </button>
              </th>
              <th>Email</th>
              <th>Client Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="users-empty">
                  No candidates found
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => (
                <tr key={candidate.id} className="clients-table__row">
                  <td>{candidate.name}</td>
                  <td>{candidate.contact_number}</td>
                  <td>{candidate.email || '-'}</td>
                  <td>{candidate.client_display_name || '-'}</td>
                  <td>
                    <div className="roles-table__actions users-actions">
                      <button
                        className="button users-icon-btn action-animate"
                        onClick={() => onEdit(candidate)}
                        disabled={activeCandidateId === candidate.id}
                        title="Edit"
                        aria-label="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="button button--danger users-icon-btn action-animate"
                        onClick={() => onDelete(candidate)}
                        disabled={activeCandidateId === candidate.id}
                        title="Delete"
                        aria-label="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="users-pagination">
        <button
          className="button"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={effectivePage === 1}
        >
          Previous
        </button>

        <div className="users-pagination__pages">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              className={pageNumber === effectivePage ? 'button button--primary' : 'button'}
              onClick={() => setCurrentPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          className="button"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={effectivePage === totalPages}
        >
          Next
        </button>
      </div>
    </>
  )
}

export default CandidatesTable
