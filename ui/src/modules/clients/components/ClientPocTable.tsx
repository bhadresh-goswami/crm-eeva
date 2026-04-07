import { Fragment, useCallback, useMemo, useState } from 'react'
import type { ClientItem, PocItem } from '../api/clientsApi'

type SortField = 'client_name' | 'poc_name' | 'email'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

type TableRow = {
  id: string
  type: 'poc'
  clientId: number
  clientName: string
  poc: PocItem
}

type ClientPocTableProps = {
  clients: ClientItem[]
  isLoading: boolean
  activeActionKey: string | null
  onEditClient: (client: ClientItem) => void
  onDeleteClient: (client: ClientItem) => void
  onToggleClient: (client: ClientItem) => void
  onAddPoc: (client: ClientItem) => void
  onEditPoc: (poc: PocItem) => void
  onDeletePoc: (poc: PocItem) => void
  onTogglePoc: (poc: PocItem) => void
}

const PAGE_SIZE = 10

const isActive = (status: string) => status.toLowerCase() === 'active'

const ClientPocTable = ({
  clients,
  isLoading,
  activeActionKey,
  onEditClient,
  onDeleteClient,
  onToggleClient,
  onAddPoc,
  onEditPoc,
  onDeletePoc,
  onTogglePoc,
}: ClientPocTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('client_name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedClients, setExpandedClients] = useState<Record<number, boolean>>({})

  const rows = useMemo<TableRow[]>(() => {
    return clients.flatMap((client) =>
      client.pocs.map((poc) => ({
        id: `poc-${poc.id}`,
        type: 'poc',
        clientId: client.id,
        clientName: client.name,
        poc,
      })),
    )
  }, [clients])

  const filteredSortedRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = rows.filter((row) => {
      const pocActive = isActive(row.poc.status)
      const matchesSearch =
        !normalizedSearch ||
        row.clientName.toLowerCase().includes(normalizedSearch) ||
        row.poc.name.toLowerCase().includes(normalizedSearch) ||
        row.poc.email.toLowerCase().includes(normalizedSearch)
      const matchesClient = clientFilter === 'all' || String(row.clientId) === clientFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && pocActive) ||
        (statusFilter === 'inactive' && !pocActive)

      return matchesSearch && matchesClient && matchesStatus
    })

    return filtered.sort((left, right) => {
      const leftValue =
        sortField === 'client_name'
          ? left.clientName
          : sortField === 'poc_name'
            ? left.poc.name
            : left.poc.email
      const rightValue =
        sortField === 'client_name'
          ? right.clientName
          : sortField === 'poc_name'
            ? right.poc.name
            : right.poc.email

      const compared = leftValue.toLowerCase().localeCompare(rightValue.toLowerCase())
      return sortOrder === 'asc' ? compared : -compared
    })
  }, [clientFilter, rows, searchTerm, sortField, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSortedRows.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)

  const pageRows = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredSortedRows.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredSortedRows])

  const visibleClients = useMemo(() => {
    const grouped = new Map<number, { client: ClientItem; rows: TableRow[] }>()

    pageRows.forEach((row) => {
      const matchedClient = clients.find((item) => item.id === row.clientId)
      if (!matchedClient) {
        return
      }

      const existing = grouped.get(row.clientId)
      if (existing) {
        existing.rows.push(row)
      } else {
        grouped.set(row.clientId, { client: matchedClient, rows: [row] })
      }
    })

    return Array.from(grouped.values())
  }, [clients, pageRows])

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  const toggleSort = useCallback((field: SortField) => {
    setCurrentPage(1)
    if (sortField === field) {
      setSortOrder((curr) => (curr === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortOrder('asc')
  }, [sortField])

  const toggleExpand = useCallback((clientId: number) => {
    setExpandedClients((current) => ({ ...current, [clientId]: !current[clientId] }))
  }, [])

  const clearFilters = () => {
    setSearchTerm('')
    setClientFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return '↕'
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return <div className="card users-loader">Loading clients and POCs...</div>
  }

  return (
    <>
      <div className="card clients-controls">
        <label className="auth-card__field" htmlFor="clientPocSearch">
          Search
          <input
            id="clientPocSearch"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label className="auth-card__field" htmlFor="clientFilter">
          Client
          <select
            id="clientFilter"
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

        <label className="auth-card__field" htmlFor="statusFilter">
          Status
          <select
            id="statusFilter"
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

        <button className="button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      <div className="card clients-table__wrapper">
        <table className="roles-table clients-table">
          <thead>
            <tr>
              <th>
                <button className="table-sort" onClick={() => toggleSort('client_name')}>
                  Client Name {sortIndicator('client_name')}
                </button>
              </th>
              <th>
                <button className="table-sort" onClick={() => toggleSort('poc_name')}>
                  POC Name {sortIndicator('poc_name')}
                </button>
              </th>
              <th>
                <button className="table-sort" onClick={() => toggleSort('email')}>
                  Email {sortIndicator('email')}
                </button>
              </th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="users-empty">
                  No data found
                </td>
              </tr>
            ) : (
              visibleClients.map(({ client, rows: groupedRows }) => {
                const open = expandedClients[client.id] ?? true

                return (
                  <Fragment key={`client-group-${client.id}`}>
                    <tr className="client-row" onClick={() => toggleExpand(client.id)}>
                      <td>
                        <button
                          className="table-expand-btn"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleExpand(client.id)
                          }}
                        >
                          {open ? '▾' : '▸'} {client.name}
                        </button>
                      </td>
                      <td colSpan={3}>Client record ({groupedRows.length} POCs)</td>
                      <td>
                        <span className={isActive(client.status) ? 'status-pill status-pill--active' : 'status-pill status-pill--inactive'}>
                          {client.status}
                        </span>
                      </td>
                      <td>
                        <div className="roles-table__actions users-actions">
                          <button
                            className="button users-icon-btn action-animate"
                            onClick={(event) => {
                              event.stopPropagation()
                              onEditClient(client)
                            }}
                            title="Edit"
                            aria-label="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="button users-icon-btn action-animate"
                            onClick={(event) => {
                              event.stopPropagation()
                              onAddPoc(client)
                            }}
                            title="Add POC"
                            aria-label="Add POC"
                          >
                            ➕
                          </button>
                          <details className="users-more-actions" onClick={(event) => event.stopPropagation()}>
                            <summary className="button users-icon-btn" title="More actions" aria-label="More actions">
                              ⋮
                            </summary>
                            <div className="users-more-actions__menu">
                              <button className="button users-menu-btn" onClick={() => onToggleClient(client)}>
                                🔄 {isActive(client.status) ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="button button--danger users-menu-btn" onClick={() => onDeleteClient(client)}>
                                🗑️ Delete
                              </button>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>

                    {open
                      ? groupedRows.map((row) => (
                          <tr key={row.id} className="poc-row">
                            <td>{row.clientName}</td>
                            <td>{row.poc.name}</td>
                            <td>{row.poc.email || '-'}</td>
                            <td>{row.poc.mobile || '-'}</td>
                            <td>
                              <span
                                className={
                                  isActive(row.poc.status)
                                    ? 'status-pill status-pill--active status-pill--animated'
                                    : 'status-pill status-pill--inactive status-pill--animated'
                                }
                              >
                                {row.poc.status}
                              </span>
                            </td>
                            <td>
                              <div className="roles-table__actions users-actions">
                                <button
                                  className="button users-icon-btn action-animate"
                                  onClick={() => onEditPoc(row.poc)}
                                  title="Edit"
                                  aria-label="Edit"
                                  disabled={activeActionKey === row.id}
                                >
                                  ✏️
                                </button>
                                <details className="users-more-actions">
                                  <summary className="button users-icon-btn" title="More actions" aria-label="More actions">
                                    ⋮
                                  </summary>
                                  <div className="users-more-actions__menu">
                                    <button className="button users-menu-btn" onClick={() => onTogglePoc(row.poc)}>
                                      🔄 {isActive(row.poc.status) ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button className="button button--danger users-menu-btn" onClick={() => onDeletePoc(row.poc)}>
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </details>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="users-pagination">
        <button className="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={effectivePage === 1}>
          Previous
        </button>
        <div className="users-pagination__pages">
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={page === effectivePage ? 'button button--primary' : 'button'}
              onClick={() => setCurrentPage(page)}
            >
              {page}
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

export default ClientPocTable
