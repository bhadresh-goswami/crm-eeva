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
  token: string
  user: AuthUser
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

const getStoredAuthState = (): StoredAuthState | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredAuthState
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
    token ? getStoredSessionStatus() : 'logged_out',
  )

  const clearAuthState = useCallback(() => {
    setToken(null)
    setUser(null)
    setSessionStatus('logged_out')
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_out')
  }, [])

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email and password are required.')
    }

    const body = JSON.stringify({
      email,
      password,
    })

    console.info('[login] Request URL:', 'https://support.bsquareg-developers.com/api/login')
    console.info('[login] Request Body:', body)

    const response = await apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body,
    })

    const nextAuthState: StoredAuthState = {
      token: response.token,
      user: response.user,
    }

    setToken(response.token)
    setUser(response.user)
    setSessionStatus('logged_in')

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuthState))
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_in')
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiRequest('/logout', { method: 'POST' })
      } catch {
        // The logout endpoint may not exist yet.
      }
    }

    clearAuthState()
  }, [clearAuthState, token])

  const breakIn = useCallback(async () => {
    setSessionStatus('logged_in')
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'logged_in')

    try {
      await apiRequest('/break-in', { method: 'POST' })
    } catch {
      console.info('breakIn placeholder called: /break-in is unavailable.')
    }
  }, [])

  const breakOut = useCallback(async () => {
    setSessionStatus('break')
    localStorage.setItem(SESSION_STATUS_STORAGE_KEY, 'break')

    try {
      await apiRequest('/break-out', { method: 'POST' })
    } catch {
      console.info('breakOut placeholder called: /break-out is unavailable.')
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthState()
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
