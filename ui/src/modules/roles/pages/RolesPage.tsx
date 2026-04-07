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

const RolesPage = () => {
  const { user } = useAuth()

  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionRoleId, setActionRoleId] = useState<number | null>(null)

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
          <RolesTable
            roles={roles}
            isLoading={isLoading}
            actionRoleId={actionRoleId}
            onEdit={setEditingRole}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        </div>
      </div>
    </section>
  )
}

export default RolesPage
