import { useMemo, useState } from 'react'
import type { ClientOption, PocItem } from '../api/pocApi'

type SortField = 'name' | 'email'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

type PocsTableProps = {
  pocs: PocItem[]
  clients: ClientOption[]
  isLoading: boolean
  activePocId: number | null
  onEdit: (poc: PocItem) => void
  onDelete: (poc: PocItem) => void
  onToggle: (poc: PocItem) => void
}

const PAGE_SIZE = 10

const isPocActive = (status: string) => status.trim().toLowerCase() === 'active'

const PocsTable = ({ pocs, clients, isLoading, activePocId, onEdit, onDelete, onToggle }: PocsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSorted = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = pocs.filter((poc) => {
      const matchesSearch =
        !normalizedSearch ||
        poc.name.toLowerCase().includes(normalizedSearch) ||
        poc.email.toLowerCase().includes(normalizedSearch)

      const matchesClient = clientFilter === 'all' || String(poc.client_id) === clientFilter
      const active = isPocActive(poc.status)
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' && active) || (statusFilter === 'inactive' && !active)

      return matchesSearch && matchesClient && matchesStatus
    })

    return [...filtered].sort((left, right) => {
      const leftValue = String(left[sortField] ?? '').toLowerCase()
      const rightValue = String(right[sortField] ?? '').toLowerCase()
      const compared = leftValue.localeCompare(rightValue)
      return sortOrder === 'asc' ? compared : -compared
    })
  }, [clientFilter, pocs, searchTerm, sortField, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)

  const paginatedPocs = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredAndSorted.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredAndSorted])

  const clientNameMap = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client.name]))
  }, [clients])

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
        <p className="card-text">Loading POCs...</p>
      </div>
    )
  }

  return (
    <>
      <div className="card pocs-controls">
        <label className="auth-card__field" htmlFor="pocsSearch">
          Search
          <input
            id="pocsSearch"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label className="auth-card__field" htmlFor="pocsClientFilter">
          Client
          <select
            id="pocsClientFilter"
            value={clientFilter}
            onChange={(event) => {
              setClientFilter(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <label className="auth-card__field" htmlFor="pocsStatusFilter">
          Status
          <select
            id="pocsStatusFilter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter)
              setCurrentPage(1)
            }}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="card users-table__fade">
        <div className="pocs-table__wrapper">
          <table className="roles-table pocs-table">
            <thead>
              <tr>
                <th>
                  <button className="table-sort" onClick={() => handleSort('name')}>
                    Name {sortIndicator('name')}
                  </button>
                </th>
                <th>
                  <button className="table-sort" onClick={() => handleSort('email')}>
                    Email {sortIndicator('email')}
                  </button>
                </th>
                <th>Mobile</th>
                <th>Client Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="users-empty">
                    No POCs found
                  </td>
                </tr>
              ) : (
                paginatedPocs.map((poc) => {
                  const active = isPocActive(poc.status)
                  const clientName = poc.client_name || clientNameMap.get(poc.client_id) || '-'

                  return (
                    <tr key={poc.id}>
                      <td>{poc.name}</td>
                      <td>{poc.email}</td>
                      <td>{poc.mobile || '-'}</td>
                      <td>{clientName}</td>
                      <td>
                        <span className={active ? 'status-pill status-pill--active' : 'status-pill status-pill--inactive'}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="roles-table__actions users-actions">
                          <button
                            className="button users-icon-btn action-animate"
                            onClick={() => onEdit(poc)}
                            disabled={activePocId === poc.id}
                            title="Edit"
                            aria-label="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="button users-icon-btn action-animate"
                            onClick={() => onToggle(poc)}
                            disabled={activePocId === poc.id}
                            title={active ? 'Deactivate' : 'Activate'}
                            aria-label={active ? 'Deactivate' : 'Activate'}
                          >
                            🔄
                          </button>
                          <button
                            className="button button--danger users-icon-btn action-animate"
                            onClick={() => onDelete(poc)}
                            disabled={activePocId === poc.id}
                            title="Delete"
                            aria-label="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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

export default PocsTable
