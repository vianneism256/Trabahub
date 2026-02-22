import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAuth } from '../context/AuthProvider'

export default function SelectRole() {
  const [role, setRole] = useState('customer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          role,
          verified: false,
          updatedAt: Date.now(),
        },
        { merge: true }
      )
      if (role === 'freelancer') navigate('/freelancer')
      else if (role === 'admin') navigate('/admin')
      else navigate('/customer')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 40, maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <h2>Welcome! Select your role</h2>
      <p>Are you signing up as a customer or a freelancer?</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
        <div style={{ marginBottom: 20, textAlign: 'left' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <input
              type="radio"
              value="customer"
              checked={role === 'customer'}
              onChange={(e) => setRole(e.target.value)}
            />
            <span><strong>Customer</strong> - Looking to hire freelancers</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: 10, gap: 10 }}>
            <input
              type="radio"
              value="freelancer"
              checked={role === 'freelancer'}
              onChange={(e) => setRole(e.target.value)}
            />
            <span><strong>Freelancer</strong> - Offering services (plumbing, electrical, etc.)</span>
          </label>
        </div>
        
        <button type="submit" disabled={loading} style={{
          padding: '12px 30px',
          fontSize: 16,
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          width: '100%',
        }}>
          {loading ? 'Setting up...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
