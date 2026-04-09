/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest, setUnauthorizedHandler } from '../api/client'

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'expert' | 'expertlead'

export type SessionStatus = 'logged_in' | 'break' | 'logged_out'

type AuthUser = {
  id: string
  name: string
  role: UserRole
}

type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  token?: string
  access_token?: string
  user?: {
    id?: string | number
    name?: string
    role?: string
    user_role?: string
  }
  data?: {
    token?: string
    access_token?: string
    user?: {
      id?: string | number
      name?: string
      role?: string
      user_role?: string
    }
  }
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  sessionStatus: SessionStatus
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  breakIn: () => Promise<void>
  breakOut: () => Promise<void>
}

const AUTH_STORAGE_KEY = 'crm_auth'
const SESSION_STATUS_STORAGE_KEY = 'crm_session_status'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

type StoredAuthState = {
  token: string
  user: AuthUser
}

const normalizeRole = (role: string | undefined): UserRole => {
  const normalized = role?.trim().toLowerCase().replaceAll(' ', '').replaceAll('-', '').replaceAll('_', '')

  if (normalized === 'admin') return 'admin'
  if (normalized === 'manager') return 'manager'
  if (normalized === 'coordinator' || normalized === 'technicalcoordinator') return 'coordinator'
  if (normalized === 'technicalexpert' || normalized === 'expert') return 'expert'
  if (normalized === 'expertlead' || normalized === 'teamlead' || normalized === 'technicallead') {
    return 'expertlead'
  }

  return 'expert'
}

const normalizeUser = (user: { id?: string | number; name?: string; role?: string; user_role?: string }): AuthUser => ({
  id: String(user.id ?? ''),
  name: String(user.name ?? '').trim(),
  role: normalizeRole(user.role ?? user.user_role),
})

const getStoredAuthState = (): StoredAuthState | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string; user?: { id?: string | number; name?: string; role?: string } }

    if (!parsed.token || !parsed.user?.id) {
      return null
    }

    return {
      token: parsed.token,
      user: normalizeUser(parsed.user),
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

const getStoredSessionStatus = (): SessionStatus => {
  const storedStatus = localStorage.getItem(SESSION_STATUS_STORAGE_KEY)

  if (storedStatus === 'logged_in' || storedStatus === 'break' || storedStatus === 'logged_out') {
    return storedStatus
  }

  return 'logged_out'
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const storedAuth = getStoredAuthState()
  const [token, setToken] = useState<string | null>(storedAuth?.token ?? null)
  const [user, setUser] = useState<AuthUser | null>(storedAuth?.user ?? null)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(
    storedAuth?.token ? getStoredSessionStatus() : 'logged_out',
  )

  const clearAuthState = useCallback(() => {
    setToken(null)
    setUser(null)
    setSessionStatus('logged_out')
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_out')
  }, [])

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email and password are required.')
    }

    const response = await apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const tokenValue = response.token ?? response.access_token ?? response.data?.token ?? response.data?.access_token
    const userValue = response.user ?? response.data?.user

    if (!tokenValue || !userValue?.id) {
      throw new Error('Login response missing token or user details.')
    }

    const nextUser = normalizeUser(userValue)

    const nextAuthState: StoredAuthState = {
      token: tokenValue,
      user: nextUser,
    }

    setToken(tokenValue)
    setUser(nextUser)
    setSessionStatus('logged_in')

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuthState))
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_in')
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiRequest('/logout', { method: 'POST' })
      } catch {
        // Backend may return an error for an already expired token.
      }
    }

    clearAuthState()
    window.location.replace('/login')
  }, [clearAuthState, token])

  const breakIn = useCallback(async () => {
    try {
      await apiRequest('/break-in', { method: 'POST' })
      setSessionStatus('logged_in')
      localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_in')
    } catch (error) {
      console.error('breakIn failed', error)
      throw error
    }
  }, [])

  const breakOut = useCallback(async () => {
    try {
      await apiRequest('/break-out', { method: 'POST' })
      setSessionStatus('break')
      localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'break')
    } catch (error) {
      console.error('breakOut failed', error)
      throw error
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthState()
      window.location.replace('/login')
    })

    return () => setUnauthorizedHandler(undefined)
  }, [clearAuthState])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      sessionStatus,
      login,
      logout,
      breakIn,
      breakOut,
    }),
    [breakIn, breakOut, login, logout, sessionStatus, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
