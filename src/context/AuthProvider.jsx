import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase.js'

const AuthContext = createContext()

function mapUser(user) {
  return {
    ...user,
    uid: user.id,
    displayName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      '',
  }
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, role = 'customer', displayName = '') {
    const normalizedDisplayName = displayName || email.split('@')[0]
    const { data, error } = await supabase.auth.signUp(
      {
        email,
        password,
      },
      {
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
        data: {
          display_name: normalizedDisplayName,
          role,
        },
      }
    )
    if (error) throw error

    const user = data.user
    if (!user) return null

    const { error: insertError } = await supabase.from('users').insert({
      firebase_uid: user.id,
      email,
      display_name: normalizedDisplayName,
      role,
    })
    if (insertError) throw insertError

    return mapUser(user)
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (!data.user) return null
    return mapUser(data.user)
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) throw error
    if (data?.url) {
      window.location.href = data.url
    }
    return null
  }

  function logout() {
    return supabase.auth.signOut()
  }

  function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
  }

  useEffect(() => {
    let authSubscription

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setCurrentUser(session?.user ? mapUser(session.user) : null)
      setLoading(false)
    }

    initAuth()

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ? mapUser(session.user) : null)
      setLoading(false)
    })

    authSubscription = data?.subscription

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
