import { useMemo, useState } from 'react'
import type { UserItem } from '../api/usersApi'

type UsersTableProps = {
  users: UserItem[]
  isLoading: boolean
  activeActionId: number | null
  onEdit: (user: UserItem) => void
  onDelete: (user: UserItem) => void
  onToggle: (user: UserItem) => void
  onUpdatePassword: (user: UserItem) => void
}

type SortField = 'name' | 'email' | 'role'
type SortOrder = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

const PAGE_SIZE = 10

const isUserActive = (status: string) => {
  const normalized = status.trim().toLowerCase()
  return normalized === 'active' || normalized === '1' || normalized === 'true'
}

const UsersTable = ({
  users,
  isLoading,
  activeActionId,
  onEdit,
  onDelete,
  onToggle,
  onUpdatePassword,
}: UsersTableProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const roleOptions = useMemo(
    () => [...new Set(users.map((item) => item.role).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [users],
  )

  const filteredAndSortedUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      const active = isUserActive(String(user.status))
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' && active) || (statusFilter === 'inactive' && !active)

      return matchesSearch && matchesRole && matchesStatus
    })

    const sorted = [...filtered].sort((a, b) => {
      const left = String(a[sortField] ?? '').toLowerCase()
      const right = String(b[sortField] ?? '').toLowerCase()
      const compared = left.localeCompare(right)
      return sortOrder === 'asc' ? compared : -compared
    })

    return sorted
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / PAGE_SIZE))

  const effectivePage = Math.min(currentPage, totalPages)

  const paginatedUsers = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE
    return filteredAndSortedUsers.slice(start, start + PAGE_SIZE)
  }, [effectivePage, filteredAndSortedUsers])

  const handleSort = (field: SortField) => {
    setCurrentPage(1)
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(field)
    setSortOrder('asc')
  }

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages])

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return '↕'
    }

    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <div className="card users-loader">
        <p className="card-text">Loading users...</p>
      </div>
    )
  }

  return (
    <>
      <div className="card users-controls">
        <label className="auth-card__field" htmlFor="usersSearch">
          Search
          <input
            id="usersSearch"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label className="auth-card__field" htmlFor="usersRoleFilter">
          Role
          <select
            id="usersRoleFilter"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="auth-card__field" htmlFor="usersStatusFilter">
          Status
          <select
            id="usersStatusFilter"
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

      <div className="card users-table__wrapper users-table__fade">
        <table className="roles-table users-table">
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
              <th>
                <button className="table-sort" onClick={() => handleSort('role')}>
                  Role {sortIndicator('role')}
                </button>
              </th>
              <th>Team Lead</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="card-text users-empty">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isActive = isUserActive(String(user.status))

                return (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role || '-'}</td>
                    <td>{user.team_lead || '-'}</td>
                    <td>
                      <span
                        className={
                          isActive
                            ? 'status-pill status-pill--active'
                            : 'status-pill status-pill--inactive'
                        }
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="roles-table__actions users-actions">
                        <button
                          className="button users-icon-btn"
                          onClick={() => onEdit(user)}
                          disabled={activeActionId === user.id}
                          title="Edit"
                          aria-label="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="button users-icon-btn"
                          onClick={() => onToggle(user)}
                          disabled={activeActionId === user.id}
                          title={isActive ? 'Deactivate' : 'Activate'}
                          aria-label={isActive ? 'Deactivate' : 'Activate'}
                        >
                          🔄
                        </button>

                        <button
                          className="button users-icon-btn"
                          onClick={() => onUpdatePassword(user)}
                          disabled={activeActionId === user.id}
                          title="Update password"
                          aria-label="Update password"
                        >
                          🔒
                        </button>
                        <button
                          className="button button--danger users-icon-btn"
                          onClick={() => onDelete(user)}
                          disabled={activeActionId === user.id}
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

export default UsersTable
