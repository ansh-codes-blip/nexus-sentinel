import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react' 

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexus_token'))

  const login = (newToken: string) => {
    localStorage.setItem('nexus_token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('nexus_token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}