import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../supabase.js'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('customer')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
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
    if (!agreedToTerms) {
      setError('You must agree to the Terms and Conditions to create an account.')
      return
    }
    try {
      const user = await signup(email, password)
      const { error: dbError } = await supabase.from('users').upsert({
        firebase_uid: user.uid,
        email: user.email,
        role,
      }, { onConflict: 'firebase_uid' })
      if (dbError) throw dbError
      const profileTable = role === 'freelancer' ? 'freelancers' : 'customers'
      const { error: profileError } = await supabase.from(profileTable).upsert({
        firebase_uid: user.uid,
        email: user.email,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      }, { onConflict: 'firebase_uid' })
      if (profileError) throw profileError
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
          <label><strong>First Name</strong></label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" required />
        </div>

        <div style={{ marginBottom: 15 }}>
          <label><strong>Last Name</strong></label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="dela Cruz" required />
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
        
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input
            id="terms-checkbox"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0, cursor: 'pointer' }}
          />
          <label htmlFor="terms-checkbox" style={{ fontSize: 13, color: '#555', lineHeight: 1.5, cursor: 'pointer', margin: 0, fontWeight: 'normal' }}>
            I have read and agree to the{' '}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#007bff', fontWeight: 600 }}
            >
              Terms and Conditions
            </Link>
            . I understand that Trabahub connects customers with independent freelancers and is not responsible for services rendered.
          </label>
        </div>

        <button
          type="submit"
          disabled={!agreedToTerms}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: agreedToTerms ? '#28a745' : '#aaa',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: agreedToTerms ? 'pointer' : 'not-allowed',
          }}
        >
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