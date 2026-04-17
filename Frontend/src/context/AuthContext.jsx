import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

const STORAGE_KEYS = {
  token: 'authToken',
  user: 'authUser',
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem(STORAGE_KEYS.token) || '')
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.user)
    return raw ? JSON.parse(raw) : null
  })
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const persistSession = (nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(STORAGE_KEYS.token, nextToken)
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser))
  }

  const clearSession = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.user)
  }

  const login = async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password })
    persistSession(response.data.token, response.data.user)
    return response.data.user
  }

  const register = async ({ name, email, password, businessSpeciality }) => {
    const response = await api.post('/auth/register', { name, email, password, businessSpeciality })
    persistSession(response.data.token, response.data.user)
    return response.data.user
  }

  const logout = () => {
    clearSession()
  }

  useEffect(() => {
    const syncCurrentUser = async () => {
      if (!token) {
        setIsBootstrapping(false)
        return
      }

      try {
        const response = await api.get('/auth/me')
        const serverUser = response.data.user
        setUser(serverUser)
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(serverUser))
      } catch (_error) {
        clearSession()
      } finally {
        setIsBootstrapping(false)
      }
    }

    syncCurrentUser()
  }, [token])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [token, user, isBootstrapping],
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
