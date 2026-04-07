import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  createRole,
  deleteRole,
  getRoles,
  toggleRole,
  type Role,
  updateRole,
} from '../api/rolesApi'
import RoleForm from '../components/RoleForm'
import RolesTable from '../components/RolesTable'

type StatusFilter = 'all' | 'active' | 'inactive'

const PAGE_SIZE = 5

const RolesPage = () => {
  const { user } = useAuth()

  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionRoleId, setActionRoleId] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const loadRoles = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const data = await getRoles()
      setRoles(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load roles.'
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2500)
  }

  const handleSubmit = async (name: string) => {
    setIsSubmitting(true)
    setPageError(null)

    try {
      if (editingRole) {
        await updateRole(editingRole.id, name)
        showSuccess('Role updated successfully.')
      } else {
        await createRole(name)
        showSuccess('Role created successfully.')
      }

      setEditingRole(null)
      await loadRoles()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save role.'
      setPageError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (role: Role) => {
    const shouldDelete = window.confirm(`Are you sure you want to delete "${role.name}"?`)

    if (!shouldDelete) {
      return
    }

    setActionRoleId(role.id)
    setPageError(null)

    try {
      await deleteRole(role.id)
      showSuccess('Role deleted successfully.')
      if (editingRole?.id === role.id) {
        setEditingRole(null)
      }
      await loadRoles()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete role.'
      setPageError(message)
    } finally {
      setActionRoleId(null)
    }
  }

  const handleToggle = async (role: Role) => {
    setActionRoleId(role.id)
    setPageError(null)

    try {
      await toggleRole(role.id)
      showSuccess(`Role ${role.isActive ? 'deactivated' : 'activated'} successfully.`)
      await loadRoles()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle role status.'
      setPageError(message)
    } finally {
      setActionRoleId(null)
    }
  }

  const existingRoleNames = useMemo(
    () => roles.filter((role) => role.id !== editingRole?.id).map((role) => role.name),
    [editingRole?.id, roles],
  )

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return roles.filter((role) => {
      const matchesSearch =
        !normalizedSearch ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        String(role.id).includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && role.isActive) ||
        (statusFilter === 'inactive' && !role.isActive)

      return matchesSearch && matchesStatus
    })
  }, [roles, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredRoles.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredRoles])

  const startItem = filteredRoles.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredRoles.length)

  if (!user) {
    return <Navigate replace to="/login" />
  }

  if (user.role !== 'admin') {
    return <Navigate replace to="/dashboard" />
  }

  return (
    <section>
      <h2 className="page-title">Role Management</h2>
      <p className="page-description">Manage CRM roles and activation status.</p>

      <div className="roles-layout">
        <RoleForm
          existingNames={existingRoleNames}
          editingRoleId={editingRole?.id ?? null}
          initialName={editingRole?.name ?? ''}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancelEdit={() => setEditingRole(null)}
        />

        <div>
          {pageError ? <p className="auth-card__error roles-feedback">{pageError}</p> : null}
          {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

          <div className="card roles-controls">
            <label className="auth-card__field" htmlFor="roleSearch">
              Search
              <input
                id="roleSearch"
                placeholder="Search by role name or ID"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="auth-card__field" htmlFor="roleStatusFilter">
              Filter by status
              <select
                id="roleStatusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="roles-controls__select"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <RolesTable
            roles={paginatedRoles}
            isLoading={isLoading}
            actionRoleId={actionRoleId}
            onEdit={setEditingRole}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />

          {!isLoading ? (
            <div className="roles-pagination">
              <p className="card-text">
                Showing {startItem}-{endItem} of {filteredRoles.length} roles
              </p>
              <div className="roles-pagination__actions">
                <button
                  className="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="roles-pagination__text">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages || filteredRoles.length === 0}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default RolesPage
