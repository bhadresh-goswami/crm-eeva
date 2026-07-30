import { useMemo, useState } from 'react'
import type { PocItem } from '../api/clientsApi'

type PocsTableProps = {
  pocs: PocItem[]
  isLoading: boolean
  activePocId: number | null
  onEdit: (poc: PocItem) => void
  onDelete: (poc: PocItem) => void
  onToggle: (poc: PocItem) => void
}

const PAGE_SIZE = 10

const PocsTable = ({ pocs, isLoading, activePocId, onEdit, onDelete, onToggle }: PocsTableProps) => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return pocs.filter((item) => {
      const matchesSearch = !s || item.name.toLowerCase().includes(s) || item.email.toLowerCase().includes(s) || (item.client_name ?? '').toLowerCase().includes(s)
      const active = item.status.toLowerCase() === 'active'
      const matchesStatus = status === 'all' || (status === 'active' && active) || (status === 'inactive' && !active)
      return matchesSearch && matchesStatus
    })
  }, [pocs, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const effectivePage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => filtered.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE), [effectivePage, filtered])

  if (isLoading) {
    return <div className="card users-loader">Loading POCs...</div>
  }

  return (
    <>
      <div className="card clients-controls">
        <label className="auth-card__field" htmlFor="pocSearch">Search
          <input id="pocSearch" value={search} placeholder="Search by POC/client/email" onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} />
        </label>
        <label className="auth-card__field" htmlFor="pocStatus">Status
          <select id="pocStatus" value={status} onChange={(event) => { setStatus(event.target.value as 'all' | 'active' | 'inactive'); setCurrentPage(1) }}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="card clients-table__wrapper clients-table__fade">
        <table className="roles-table clients-table">
          <thead>
            <tr><th>Client</th><th>POC Name</th><th>Email</th><th>Mobile</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6} className="users-empty">No POC data found</td></tr>
            ) : paginated.map((poc) => {
              const active = poc.status.toLowerCase() === 'active'
              return (
                <tr key={poc.id} className="clients-table__row">
                  <td>{poc.client_name ?? '-'}</td>
                  <td>{poc.name}</td>
                  <td>{poc.email || '-'}</td>
                  <td>{poc.mobile || '-'}</td>
                  <td><span className={active ? 'status-pill status-pill--active' : 'status-pill status-pill--inactive'}>{poc.status}</span></td>
                  <td>
                    <div className="roles-table__actions users-actions">
                      <button className="button users-icon-btn action-animate" onClick={() => onEdit(poc)} disabled={activePocId === poc.id} title="Edit">✏️</button>
                      <button className="button users-icon-btn action-animate" onClick={() => onToggle(poc)} disabled={activePocId === poc.id} title={active ? 'Deactivate' : 'Activate'}>🔄</button>
                      <button className="button button--danger users-icon-btn action-animate" onClick={() => onDelete(poc)} disabled={activePocId === poc.id} title="Delete">🗑️</button>
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
        <span className="roles-pagination__text">Page {effectivePage} of {totalPages}</span>
        <button className="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={effectivePage === totalPages}>Next</button>
      </div>
    </>
  )
}

export default PocsTable
