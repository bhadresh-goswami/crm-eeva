import { useCallback, useMemo, useState } from 'react'
import type { ClientItem } from '../api/clientsApi'
import type { PocItem } from '../../pocs/api/pocApi'

type SortField = 'client_name' | 'poc_name' | 'email'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

type ClientPocTableProps = {
  clients: ClientItem[]
  pocs: PocItem[]
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
  pocs,
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

  const clientMap = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])

  const filteredSortedRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = pocs.filter((poc) => {
      const clientName = poc.client_name || clientMap.get(poc.client_id)?.name || ''
      const pocActive = isActive(poc.status)
      const matchesSearch =
        !normalizedSearch ||
        clientName.toLowerCase().includes(normalizedSearch) ||
        poc.name.toLowerCase().includes(normalizedSearch) ||
        poc.email.toLowerCase().includes(normalizedSearch)
      const matchesClient = clientFilter === 'all' || String(poc.client_id) === clientFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && pocActive) ||
        (statusFilter === 'inactive' && !pocActive)

      return matchesSearch && matchesClient && matchesStatus
    })

    return filtered.sort((left, right) => {
      const leftClient = left.client_name || clientMap.get(left.client_id)?.name || ''
      const rightClient = right.client_name || clientMap.get(right.client_id)?.name || ''
      const leftValue = sortField === 'client_name' ? leftClient : sortField === 'poc_name' ? left.name : left.email
      const rightValue = sortField === 'client_name' ? rightClient : sortField === 'poc_name' ? right.name : right.email

      const compared = leftValue.toLowerCase().localeCompare(rightValue.toLowerCase())
      return sortOrder === 'asc' ? compared : -compared
    })
  }, [clientFilter, clientMap, pocs, searchTerm, sortField, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSortedRows.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)

  const pageRows = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredSortedRows.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredSortedRows])

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

  const sortIndicator = (field: SortField) => (sortField !== field ? '↕' : sortOrder === 'asc' ? '↑' : '↓')

  if (isLoading) {
    return <div className="card users-loader">Loading clients and POCs...</div>
  }

  return (
    <>
      <div className="card clients-controls">
        <label className="auth-card__field" htmlFor="clientPocSearch">
          Search
          <input id="clientPocSearch" placeholder="Search by client, name or email" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1) }} />
        </label>

        <label className="auth-card__field" htmlFor="clientFilter">
          Client
          <select id="clientFilter" value={clientFilter} onChange={(event) => { setClientFilter(event.target.value); setCurrentPage(1) }}>
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>

        <label className="auth-card__field" htmlFor="statusFilter">
          Status
          <select id="statusFilter" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as StatusFilter); setCurrentPage(1) }}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="card clients-table__wrapper">
        <table className="roles-table clients-table">
          <thead>
            <tr>
              <th><button className="table-sort" onClick={() => toggleSort('client_name')}>Client Name {sortIndicator('client_name')}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort('poc_name')}>POC Name {sortIndicator('poc_name')}</button></th>
              <th><button className="table-sort" onClick={() => toggleSort('email')}>Email {sortIndicator('email')}</button></th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={6} className="users-empty">No data found</td></tr>
            ) : pageRows.map((poc) => {
              const client = clientMap.get(poc.client_id)
              const active = isActive(poc.status)
              return (
                <tr key={poc.id} className="clients-table__row">
                  <td>{poc.client_name || client?.name || '-'}</td>
                  <td>{poc.name}</td>
                  <td>{poc.email}</td>
                  <td>{poc.mobile || '-'}</td>
                  <td><span className={active ? 'status-pill status-pill--active' : 'status-pill status-pill--inactive'}>{active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="roles-table__actions users-actions">
                      {client ? (
                        <>
                          <button className="button users-icon-btn" title="Edit client" onClick={() => onEditClient(client)} disabled={activeActionKey === `client-${client.id}`}>🏢</button>
                          <button className="button users-icon-btn" title="Add POC" onClick={() => onAddPoc(client)} disabled={activeActionKey === `client-${client.id}`}>➕</button>
                          <button className="button users-icon-btn" title={client.status === 'Active' ? 'Deactivate client' : 'Activate client'} onClick={() => onToggleClient(client)} disabled={activeActionKey === `client-${client.id}`}>🔄</button>
                          <button className="button button--danger users-icon-btn" title="Delete client" onClick={() => onDeleteClient(client)} disabled={activeActionKey === `client-${client.id}`}>🗑️</button>
                        </>
                      ) : null}
                      <button className="button users-icon-btn" title="Edit POC" onClick={() => onEditPoc(poc)} disabled={activeActionKey === `poc-${poc.id}`}>✏️</button>
                      <button className="button users-icon-btn" title={active ? 'Deactivate POC' : 'Activate POC'} onClick={() => onTogglePoc(poc)} disabled={activeActionKey === `poc-${poc.id}`}>🔄</button>
                      <button className="button button--danger users-icon-btn" title="Delete POC" onClick={() => onDeletePoc(poc)} disabled={activeActionKey === `poc-${poc.id}`}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="users-pagination">
        <button className="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={effectivePage === 1}>Previous</button>
        <div className="users-pagination__pages">{pageNumbers.map((page) => <button key={page} className={page === effectivePage ? 'button button--primary' : 'button'} onClick={() => setCurrentPage(page)}>{page}</button>)}</div>
        <button className="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={effectivePage === totalPages}>Next</button>
      </div>
    </>
  )
}

export default ClientPocTable
