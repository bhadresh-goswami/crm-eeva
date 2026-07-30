import { useMemo, useState, type FormEvent } from 'react'
import type { RoleOption, UserItem } from '../api/usersApi'

type UserFormModalProps = {
  isOpen: boolean
  mode: 'create' | 'edit'
  user: UserItem | null
  roles: RoleOption[]
  teamLeadOptions: UserItem[]
  existingEmails: string[]
  apiError?: string | null
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: {
    id?: number
    name: string
    email: string
    password?: string
    role_id: number
    team_lead_id?: number
  }) => Promise<void>
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const UserFormModal = ({
  isOpen,
  mode,
  user,
  roles,
  teamLeadOptions,
  existingEmails,
  apiError,
  isSubmitting,
  onClose,
  onSubmit,
}: UserFormModalProps) => {
  const matchedRole = roles.find((role) => role.name.toLowerCase() === (user?.role ?? '').toLowerCase())
  const matchedTeamLead = teamLeadOptions.find(
    (option) => option.name.toLowerCase() === (user?.team_lead ?? '').toLowerCase(),
  )

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(matchedRole ? String(matchedRole.id) : '')
  const [teamLeadId, setTeamLeadId] = useState(matchedTeamLead ? String(matchedTeamLead.id) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const normalizedExistingEmails = useMemo(
    () => existingEmails.map((item) => item.toLowerCase()),
    [existingEmails],
  )

  if (!isOpen) {
    return null
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}

    if (!name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    } else if (normalizedExistingEmails.includes(email.trim().toLowerCase())) {
      nextErrors.email = 'Email must be unique.'
    }

    if (mode === 'create' && !password.trim()) {
      nextErrors.password = 'Password is required.'
    }

    if (!roleId) {
      nextErrors.role_id = 'Role is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    await onSubmit({
      id: user?.id,
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || undefined,
      role_id: Number(roleId),
      team_lead_id: teamLeadId ? Number(teamLeadId) : undefined,
    })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
        <h3 id="user-form-title" className="modal-title">
          {mode === 'create' ? 'Create User' : 'Update User'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="userName">
            Name
            <input
              id="userName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
            {errors.name ? <span className="auth-card__error">{errors.name}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="userEmail">
            Email
            <input
              id="userEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
            />
            {errors.email ? <span className="auth-card__error">{errors.email}</span> : null}
          </label>

          {mode === 'create' ? (
            <label className="auth-card__field" htmlFor="userPassword">
              Password
              <input
                id="userPassword"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
              {errors.password ? <span className="auth-card__error">{errors.password}</span> : null}
            </label>
          ) : null}

          <label className="auth-card__field" htmlFor="roleId">
            Role
            <select
              id="roleId"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_id ? <span className="auth-card__error">{errors.role_id}</span> : null}
          </label>

          <label className="auth-card__field" htmlFor="teamLeadId">
            Team Lead (optional)
            <select
              id="teamLeadId"
              value={teamLeadId}
              onChange={(event) => setTeamLeadId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select team lead</option>
              {teamLeadOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          {apiError ? <p className="auth-card__error">{apiError}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserFormModal
