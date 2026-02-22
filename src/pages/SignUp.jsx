import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { signup } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signup(email, password, role, displayName)
      if (role === 'freelancer') navigate('/freelancer')
      else if (role === 'admin') navigate('/admin')
      else navigate('/customer')
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

      <p style={{ marginTop: 20, textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  )
}
