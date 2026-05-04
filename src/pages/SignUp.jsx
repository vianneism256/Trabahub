import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../supabase.js'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { signup, signInWithGoogle, currentUser } = useAuth()

  useEffect(() => {
    if (currentUser) {
      redirectByRole(currentUser.uid)
    }
  }, [currentUser])

  async function redirectByRole(uid) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('firebase_uid', uid)
        .maybeSingle()
      if (error) throw error
      if (data?.role === 'freelancer') navigate('/freelancer')
      else if (data?.role === 'admin') navigate('/admin')
      else if (data?.role === 'customer') navigate('/customer')
      else navigate('/select-role') // ← fixed
    } catch (err) {
      console.error(err)
      navigate('/select-role') // ← fixed
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await signup(email, password)
      // Save user to Supabase immediately with role
      const { error: dbError } = await supabase.from('users').upsert({
        firebase_uid: user.uid,
        email: user.email,
        display_name: displayName || email,
        role,
      }, { onConflict: 'firebase_uid' })
      if (dbError) throw dbError
      if (role === 'freelancer') navigate('/freelancer')
      else navigate('/customer')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h2>Create Account</h2>
      {error && <p style={{ color: '#dc3545', padding: 10, backgroundColor: '#f8d7da', borderRadius: 4 }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <label><strong>Display name</strong></label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <label><strong>Email</strong></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <label><strong>Password</strong></label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <label><strong>I'm signing up as:</strong></label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%' }}>
            <option value="customer">Customer - Looking to hire</option>
            <option value="freelancer">Freelancer - Offering services</option>
          </select>
        </div>
        
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, fontWeight: 'bold' }}>
          Create Account
        </button>
      </form>

      <button onClick={handleGoogle} style={{
        width: '100%',
        padding: '12px',
        marginTop: 15,
        backgroundColor: '#fff',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: 4,
        fontSize: 16,
        fontWeight: 'bold',
      }}>
        Sign in with Google
      </button>

      <p style={{ marginTop: 20, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  )
}