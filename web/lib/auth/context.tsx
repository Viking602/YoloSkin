"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { CurrentUser } from "@/lib/api"
import { api } from "@/lib/api"

interface AuthContextType {
  user: CurrentUser | null
  token: string | null
  isLoggedIn: boolean
  isAdmin: boolean
  isLoading: boolean
  setAuth: (token: string, user: CurrentUser, keepLogin: boolean) => void
  clearAuth: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.getCurrentUser()
        if (response.code === 0) {
          setUser(response.data)
          setToken("cookie-session")
          return
        }
      } catch {
        // ignore bootstrap errors
      }

      setUser(null)
      setToken(null)
    }

    void bootstrap().finally(() => {
      setIsLoading(false)
    })
  }, [])

  const setAuth = useCallback((nextToken: string, nextUser: CurrentUser, _keepLogin: boolean) => {
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const clearAuth = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(user && token),
      isAdmin: Boolean(user?.is_admin),
      isLoading,
      setAuth,
      clearAuth,
      logout,
    }),
    [user, token, isLoading, setAuth, clearAuth, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
