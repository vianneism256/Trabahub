import React, { useState } from 'react'
import { useAuth } from '../context/AuthProvider'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await resetPassword(email)
      setMessage('If that email exists, you will receive a reset link.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h2>Reset Password</h2>
      {error && <p style={{ color: '#dc3545', padding: 10, backgroundColor: '#f8d7da', borderRadius: 4 }}>{error}</p>}
      {message && <p style={{ color: '#155724', padding: 10, backgroundColor: '#d4edda', borderRadius: 4 }}>{message}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <label><strong>Email</strong></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, fontWeight: 'bold' }}>
          Send Reset Email
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  )
}
