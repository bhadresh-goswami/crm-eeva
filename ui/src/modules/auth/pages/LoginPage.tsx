import { useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { getRoleDashboardPath } from '../../../routes/roleDashboard'
import { useAuth } from '../../../context/AuthContext'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LoginPage = () => {
  const { isAuthenticated, login, user } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  const validationError = useMemo(() => {
    if (!email || !password) {
      return 'Email and password are required.'
    }

    if (!emailPattern.test(email)) {
      return 'Please enter a valid email address.'
    }

    return null
  }, [email, password])

  if (isAuthenticated || shouldRedirect) {
    return <Navigate replace to={getRoleDashboardPath(user?.role)} />
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
      await login({ email, password })
      setShouldRedirect(true)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1 className="auth-card__title">CRM Login</h1>
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
        <label className="auth-card__field">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="auth-card__error">{error}</p> : null}
        <button type="submit" disabled={submitting} className="button button--primary">
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
