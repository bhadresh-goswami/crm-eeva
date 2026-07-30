import { useMemo, useState } from 'react'
import type { BillingType, ClientItem } from '../api/clientsApi'

type SortField = 'name' | 'company_name'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'
type BillingFilter = 'all' | BillingType

type ClientsTableProps = {
  clients: ClientItem[]
  isLoading: boolean
  activeClientId: number | null
  onEdit: (client: ClientItem) => void
  onDelete: (client: ClientItem) => void
  onToggle: (client: ClientItem) => void
}

const PAGE_SIZE = 10

const isActive = (status: string) => status.toLowerCase() === 'active'

const ClientsTable = ({ clients, isLoading, activeClientId, onEdit, onDelete, onToggle }: ClientsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAndSorted = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        client.name.toLowerCase().includes(normalizedSearch) ||
        client.company_name.toLowerCase().includes(normalizedSearch)

      const matchesBilling = billingFilter === 'all' || client.billing_type === billingFilter

      const active = isActive(client.status)
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' && active) || (statusFilter === 'inactive' && !active)

      return matchesSearch && matchesBilling && matchesStatus
    })

    return [...filtered].sort((left, right) => {
      const leftValue = String(left[sortField] ?? '').toLowerCase()
      const rightValue = String(right[sortField] ?? '').toLowerCase()
      const compared = leftValue.localeCompare(rightValue)
      return sortOrder === 'asc' ? compared : -compared
    })
  }, [billingFilter, clients, searchTerm, sortField, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)

  const paginatedClients = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredAndSorted.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredAndSorted])

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return '↕'
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages])

  if (isLoading) {
    return (
      <div className="card users-loader">
        <p className="card-text">Loading clients...</p>
      </div>
    )
  }

  return (
    <>
      <div className="card clients-controls">
        <label className="auth-card__field" htmlFor="clientsSearch">
          Search
          <input
            id="clientsSearch"
            placeholder="Search by name or company"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label className="auth-card__field" htmlFor="clientsBillingFilter">
          Billing Type
          <select
            id="clientsBillingFilter"
            value={billingFilter}
            onChange={(event) => {
              setBillingFilter(event.target.value as BillingFilter)
              setCurrentPage(1)
            }}
          >
            <option value="all">All billing types</option>
            <option value="gst">GST</option>
            <option value="tds">TDS</option>
            <option value="personal">PERSONAL</option>
            <option value="usa">USA</option>
            <option value="cash">CASH</option>
          </select>
        </label>

        <label className="auth-card__field" htmlFor="clientsStatusFilter">
          Status
          <select
            id="clientsStatusFilter"
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

        <button
          className="button"
          onClick={() => {
            setSearchTerm('')
            setBillingFilter('all')
            setStatusFilter('all')
            setCurrentPage(1)
          }}
        >
          Clear filter
        </button>
      </div>

      <div className="card clients-table__wrapper clients-table__fade">
        <table className="roles-table clients-table">
          <thead>
            <tr>
              <th>
                <button
                  className="table-sort"
                  onClick={() => {
                    setCurrentPage(1)
                    if (sortField === 'name') {
                      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
                      return
                    }

                    setSortField('name')
                    setSortOrder('asc')
                  }}
                >
                  Name {sortIndicator('name')}
                </button>
              </th>
              <th>
                <button
                  className="table-sort"
                  onClick={() => {
                    setCurrentPage(1)
                    if (sortField === 'company_name') {
                      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
                      return
                    }

                    setSortField('company_name')
                    setSortOrder('asc')
                  }}
                >
                  Company Name {sortIndicator('company_name')}
                </button>
              </th>
              <th>Mobile</th>
              <th>Billing Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="users-empty">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedClients.map((client) => {
                const active = isActive(client.status)

                return (
                  <tr key={client.id} className="clients-table__row">
                    <td>{client.name}</td>
                    <td>{client.company_name || '-'}</td>
                    <td>{client.mobile || '-'}</td>
                    <td>{client.billing_type.toUpperCase()}</td>
                    <td>
                      <span className={active ? 'status-pill status-pill--active' : 'status-pill status-pill--inactive'}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="roles-table__actions users-actions">
                        <button
                          className="button users-icon-btn action-animate"
                          onClick={() => onEdit(client)}
                          disabled={activeClientId === client.id}
                          title="Edit"
                          aria-label="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="button users-icon-btn action-animate"
                          onClick={() => onToggle(client)}
                          disabled={activeClientId === client.id}
                          title={active ? 'Deactivate' : 'Activate'}
                          aria-label={active ? 'Deactivate' : 'Activate'}
                        >
                          🔄
                        </button>
                        <button
                          className="button button--danger users-icon-btn action-animate"
                          onClick={() => onDelete(client)}
                          disabled={activeClientId === client.id}
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

export default ClientsTable
