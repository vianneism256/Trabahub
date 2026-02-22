import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function Navigation() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (currentUser) {
      loadUserRole()
    }
  }, [currentUser])

  async function loadUserRole() {
    try {
      const docSnap = await getDoc(doc(db, 'users', currentUser.uid))
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role)
      }
    } catch (err) {
      console.error(err)
    }
  }

  function handleLogoClick(e) {
    e.preventDefault()
    if (userRole === 'freelancer') {
      navigate('/freelancer', { state: { activeTab: 'jobs-feed' } })
    } else if (userRole === 'customer') {
      navigate('/customer', { state: { activeTab: 'find-freelancers' } })
    } else if (userRole === 'admin') {
      navigate('/admin')
    } else {
      navigate('/')
    }
  }

  async function handleLogout() {
    try {
      await logout()
      setUserRole(null)
      navigate('/')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid var(--gray-300)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <button onClick={handleLogoClick} style={{ 
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--primary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }} onMouseEnter={(e) => e.target.style.opacity = '0.8'} onMouseLeave={(e) => e.target.style.opacity = '1'}>
          🛠️ Trabahub
        </button>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {currentUser ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 6,
              }}>
                <span style={{ fontSize: 20 }}>👤</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>
                    {currentUser.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                padding: '10px 16px',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: 13,
              }}>
                Login
              </Link>
              <Link to="/signup" style={{
                padding: '10px 20px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
              }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Customer tabs */}
      {currentUser && userRole === 'customer' && (
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '0 20px',
          backgroundColor: 'white',
          borderBottom: '1px solid var(--gray-300)',
        }}>
          <button
            onClick={() => navigate('/customer', { state: { activeTab: 'find-freelancers' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'find-freelancers' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'find-freelancers' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            🔍 Find Freelancers
          </button>
          <button
            onClick={() => navigate('/customer', { state: { activeTab: 'post-job' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'post-job' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'post-job' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            📝 Post a Job
          </button>
          <button
            onClick={() => navigate('/customer', { state: { activeTab: 'my-jobs' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'my-jobs' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'my-jobs' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            💼 My Jobs
          </button>
        </div>
      )}

      {/* Freelancer tabs */}
      {currentUser && userRole === 'freelancer' && (
        <div style={{
          display: 'flex',
          gap: 12,
          padding: '0 20px',
          backgroundColor: 'white',
          borderBottom: '1px solid var(--gray-300)',
        }}>
          <button
            onClick={() => navigate('/freelancer', { state: { activeTab: 'jobs-feed' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'jobs-feed' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'jobs-feed' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            🎯 Browse Jobs
          </button>
          <button
            onClick={() => navigate('/freelancer', { state: { activeTab: 'my-applications' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'my-applications' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'my-applications' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            📧 My Applications
          </button>
          <button
            onClick={() => navigate('/freelancer', { state: { activeTab: 'my-profile' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'my-profile' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'my-profile' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            👤 My Profile
          </button>
        </div>
      )}
    </div>
  )
}
