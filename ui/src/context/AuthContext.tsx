import { createContext, useContext, type ReactNode } from 'react'

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'expert' | 'expertlead'

type AuthUser = {
  role: UserRole
}

type AuthContextValue = {
  user: AuthUser
}

const mockUser: AuthUser = {
  role: 'admin',
}

const AuthContext = createContext<AuthContextValue>({ user: mockUser })

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return <AuthContext.Provider value={{ user: mockUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
