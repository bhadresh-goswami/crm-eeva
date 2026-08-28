import { useState, type FormEvent } from 'react'
import type { UserItem } from '../api/usersApi'

type PasswordModalProps = {
  user: UserItem | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: { password: string }) => Promise<void>
}

const PasswordModal = ({ user, isOpen, isSubmitting, onClose, onSubmit }: PasswordModalProps) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !user) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Both password fields are required.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    await onSubmit({ password })
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <h3 id="password-title" className="modal-title">
          Update Password - {user.name}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="auth-card__field" htmlFor="newPassword">
            New Password
            <input
              id="newPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="auth-card__field" htmlFor="confirmPassword">
            Confirm Password
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="auth-card__error">{error}</p> : null}

          <div className="modal-actions">
            <button className="button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordModal
