import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { changePassword } from '../../modules/auth/api/passwordApi'
import { useAuth } from '../../context/AuthContext'
import ChangePasswordModal from './ChangePasswordModal'

const sessionStatusLabel: Record<'logged_in' | 'break' | 'logged_out', string> = {
  logged_in: 'Logged In',
  break: 'On Break',
  logged_out: 'Logged Out',
}

const Header = () => {
  const { user, sessionStatus, breakIn, breakOut, logout } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redirectToLogin, setRedirectToLogin] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordSubmitError, setPasswordSubmitError] = useState<string | null>(null)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)

  if (!user) {
    return null
  }

  const isLoggedIn = sessionStatus === 'logged_in'
  const isOnBreak = sessionStatus === 'break'
  const isLoggedOut = sessionStatus === 'logged_out'

  const handleBreakIn = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      await breakIn()
    } catch (nextError) {
      console.error('Break In failed', nextError)
      setError('Unable to mark session as logged in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBreakOut = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      await breakOut()
    } catch (nextError) {
      console.error('Break Out failed', nextError)
      setError('Unable to mark session as break. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      await logout()
      setRedirectToLogin(true)
    } catch (nextError) {
      console.error('Logout failed', nextError)
      setError('Unable to logout right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async ({
    currentPassword,
    newPassword,
    confirmPassword,
  }: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    try {
      setIsPasswordSubmitting(true)
      setPasswordSubmitError(null)
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setIsPasswordModalOpen(false)
      setError('Password changed successfully.')
    } catch (submitError) {
      setPasswordSubmitError(submitError instanceof Error ? submitError.message : 'Unable to change password.')
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  if (redirectToLogin) {
    return <Navigate replace to="/login" />
  }

  return (
    <>
      <header className="header">
        <div className="header__identity">
          <h1 className="header__title">
            Welcome, {user.name} <span className="header__role">({user.role})</span>
          </h1>
          <p className="header__meta">Status: {sessionStatusLabel[sessionStatus]}</p>
          {error ? <p className="auth-card__error">{error}</p> : null}
        </div>

        <div className="header__actions" aria-label="Session controls">
          <button className="button" onClick={handleBreakIn} disabled={isSubmitting || isLoggedIn || isLoggedOut}>
            Break In
          </button>
          <button className="button" onClick={handleBreakOut} disabled={isSubmitting || isOnBreak || isLoggedOut}>
            Break Out
          </button>
          <button className="button" onClick={() => setIsPasswordModalOpen(true)} disabled={isSubmitting}>
            Change Password
          </button>
          <button className="button button--danger" onClick={handleLogout} disabled={isSubmitting}>
            Logout
          </button>
        </div>
      </header>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        isSubmitting={isPasswordSubmitting}
        error={passwordSubmitError}
        onClose={() => {
          setIsPasswordModalOpen(false)
          setPasswordSubmitError(null)
        }}
        onSubmit={handleChangePassword}
      />
    </>
  )
}

export default Header
