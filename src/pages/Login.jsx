import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { db } from '../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, signInWithGoogle } = useAuth()

  async function redirectByRole(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const role = userDoc.data().role
        if (role === 'freelancer') navigate('/freelancer')
        else if (role === 'admin') navigate('/admin')
        else navigate('/customer')
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error(err)
      navigate('/')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await login(email, password)
      await redirectByRole(user.uid)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      const user = await signInWithGoogle()
      if (user.isNewUser) {
        navigate('/select-role')
      } else {
        await redirectByRole(user.uid)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 20 }}>
      <h2>Login</h2>
      {error && <p style={{ color: '#dc3545', padding: 10, backgroundColor: '#f8d7da', borderRadius: 4 }}>{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 15 }}>
          <label><strong>Email</strong></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        
        <div style={{ marginBottom: 15 }}>
          <label><strong>Password</strong></label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, fontWeight: 'bold' }}>
          Login
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

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link to="/forgot" style={{ display: 'block', marginBottom: 10 }}>Forgot password?</Link>
        <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
      </div>
    </div>
  )
}
