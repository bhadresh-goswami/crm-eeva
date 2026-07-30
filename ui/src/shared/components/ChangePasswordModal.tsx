import { useState } from 'react'

type ChangePasswordModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>
}

const ChangePasswordModal = ({ isOpen, isSubmitting, error, onClose, onSubmit }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setValidationError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setValidationError('All fields are required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirm password must match.')
      return
    }

    setValidationError(null)
    await onSubmit({ currentPassword, newPassword, confirmPassword })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <h3 id="change-password-title" className="modal-title">Change Password</h3>
        <div className="modal-form">
          <label className="auth-card__field">
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="auth-card__field">
            New Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="auth-card__field">
            Confirm Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          {validationError ? <p className="auth-card__error">{validationError}</p> : null}
          {error ? <p className="auth-card__error">{error}</p> : null}
        </div>

        <div className="modal-actions">
          <button className="button" type="button" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="button button--primary" type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordModal
