import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, NavLink } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { requestPasswordReset } from '../api/passwordApi'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ForgotPasswordPage = () => {
  const { isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validationError = useMemo(() => {
    if (!email.trim()) {
      return 'Email is required.'
    }

    if (!emailPattern.test(email)) {
      return 'Please enter a valid email address.'
    }

    return null
  }, [email])

  if (isAuthenticated) {
    return <Navigate replace to="/" />
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await requestPasswordReset({ email: email.trim() })
      setSuccessMessage('Reset link sent to your email')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send reset link. Please retry.')
      setSuccessMessage(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-card__title">Forgot Password</h1>
        <label className="auth-card__field">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
          />
        </label>

        {error ? <p className="auth-card__error">{error}</p> : null}
        {successMessage ? <p className="auth-card__success">{successMessage}</p> : null}

        <button type="submit" disabled={submitting} className="button button--primary">
          {submitting ? 'Submitting...' : 'Send reset link'}
        </button>

        <NavLink className="auth-card__link" to="/login">
          Back to Login
        </NavLink>
      </form>
    </div>
  )
}

export default ForgotPasswordPage
