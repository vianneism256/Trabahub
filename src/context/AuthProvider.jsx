import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { auth } from '../firebaseConfig'
import { supabase } from '../supabase.js'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function signup(email, password, role = 'customer', displayName = '') {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const user = cred.user
    const { error } = await supabase.from('users').insert({
      firebase_uid: user.uid,
      email: user.email,
      display_name: displayName,
      role,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
    return user
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const user = cred.user
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('firebase_uid', user.uid)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return { ...user, isNewUser: true }
    }
    return user
  }

  function logout() {
    return signOut(auth)
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
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
