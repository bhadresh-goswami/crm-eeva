import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import PasswordModal from '../components/PasswordModal'
import UserFormModal from '../components/UserFormModal'
import UsersTable from '../components/UsersTable'
import {
  createUser,
  deleteUser,
  getRoleOptions,
  getUsers,
  toggleUser,
  updateUser,
  type RoleOption,
  type UserItem,
} from '../api/usersApi'

const UsersPage = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<UserItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionUserId, setActionUserId] = useState<number | null>(null)

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 2500)
  }, [])

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    setPageError(null)

    try {
      const [usersData, rolesData] = await Promise.all([getUsers(), getRoleOptions()])
      setUsers(usersData)
      setRoles(rolesData)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users data.'
      setPageError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const openCreateModal = useCallback(() => {
    setFormMode('create')
    setSelectedUser(null)
    setModalError(null)
    setIsFormOpen(true)
  }, [])

  const openEditModal = useCallback((target: UserItem) => {
    setFormMode('edit')
    setSelectedUser(target)
    setModalError(null)
    setIsFormOpen(true)
  }, [])

  const handleSubmitUser = useCallback(async (payload: {
    id?: number
    name: string
    email: string
    password?: string
    role_id: number
    team_lead_id?: number
  }) => {
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (formMode === 'create') {
        await createUser({
          name: payload.name,
          email: payload.email,
          password: payload.password ?? '',
          role_id: payload.role_id,
          team_lead_id: payload.team_lead_id,
        })
        showSuccess('User created successfully.')
      } else {
        await updateUser({
          id: payload.id ?? 0,
          name: payload.name,
          email: payload.email,
          role_id: payload.role_id,
          team_lead_id: payload.team_lead_id,
        })
        showSuccess('User updated successfully.')
      }

      setIsFormOpen(false)
      setSelectedUser(null)
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save user.'
      const normalized = message.toLowerCase()
      if (normalized.includes('duplicate') || normalized.includes('email')) {
        setModalError('Email already exists. Please use a unique email address.')
      } else {
        setModalError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [formMode, loadPageData, showSuccess])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    setActionUserId(deleteTarget.id)
    setPageError(null)

    try {
      await deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      showSuccess('User deleted successfully.')
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user.'
      setPageError(message)
    } finally {
      setActionUserId(null)
    }
  }, [deleteTarget, loadPageData, showSuccess])

  const handleToggle = useCallback(async (target: UserItem) => {
    setActionUserId(target.id)
    setPageError(null)

    try {
      await toggleUser(target.id)
      showSuccess('User status updated successfully.')
      await loadPageData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status.'
      setPageError(message)
    } finally {
      setActionUserId(null)
    }
  }, [loadPageData, showSuccess])

  const handlePasswordUpdate = useCallback(async ({ password }: { password: string }) => {
    if (!passwordTarget) {
      return
    }

    setIsSubmitting(true)

    try {
      console.log('Password update placeholder', { id: passwordTarget.id, password })
      showSuccess('Password update captured in console (API pending).')
      setPasswordTarget(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [passwordTarget, showSuccess])

  const existingEmails = useMemo(() => {
    const editingId = formMode === 'edit' ? selectedUser?.id : null

    return users.filter((item) => item.id !== editingId).map((item) => item.email)
  }, [formMode, selectedUser?.id, users])

  const teamLeadOptions = useMemo(
    () => users.filter((item) => item.id !== selectedUser?.id),
    [selectedUser?.id, users],
  )

  if (!user) {
    return <Navigate replace to="/login" />
  }

  if (user.role !== 'admin') {
    return <Navigate replace to="/dashboard" />
  }

  return (
    <section>
      <div className="users-page__header">
        <div>
          <h2 className="page-title">User Management</h2>
          <p className="page-description">Manage users, role mapping and team lead assignment.</p>
        </div>
        <button className="button button--primary" onClick={openCreateModal}>
          Create User
        </button>
      </div>

      {pageError ? <p className="auth-card__error roles-feedback">{pageError}</p> : null}
      {successMessage ? <p className="roles-success roles-feedback">{successMessage}</p> : null}

      <UsersTable
        users={users}
        isLoading={isLoading}
        activeActionId={actionUserId}
        onEdit={openEditModal}
        onDelete={setDeleteTarget}
        onToggle={handleToggle}
        onUpdatePassword={setPasswordTarget}
      />

      <UserFormModal
        key={`user-form-${formMode}-${selectedUser?.id ?? 'new'}-${isFormOpen ? 'open' : 'closed'}`}
        isOpen={isFormOpen}
        mode={formMode}
        user={selectedUser}
        roles={roles}
        teamLeadOptions={teamLeadOptions}
        existingEmails={existingEmails}
        apiError={modalError}
        isSubmitting={isSubmitting}
        onClose={() => {
          setIsFormOpen(false)
          setModalError(null)
        }}
        onSubmit={handleSubmitUser}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        isLoading={actionUserId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />

      <PasswordModal
        key={`password-${passwordTarget?.id ?? 'none'}-${passwordTarget ? 'open' : 'closed'}`}
        isOpen={Boolean(passwordTarget)}
        user={passwordTarget}
        isSubmitting={isSubmitting}
        onClose={() => setPasswordTarget(null)}
        onSubmit={handlePasswordUpdate}
      />
    </section>
  )
}

export default UsersPage
