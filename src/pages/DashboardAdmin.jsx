import React, { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { freelancerService } from '../services/freelancerService'

export default function DashboardAdmin() {
  const [freelancers, setFreelancers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('freelancers')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const freelancersData = await freelancerService.getAllFreelancers()
      setFreelancers(freelancersData)

      const usersSnap = await getDocs(collection(db, 'users'))
      const usersData = usersSnap.docs.map((d) => d.data())
      setUsers(usersData)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function toggleVerified(uid, currentStatus) {
    try {
      await freelancerService.setVerified(uid, !currentStatus)
      setFreelancers((prev) =>
        prev.map((f) => (f.uid === uid ? { ...f, verified: !currentStatus } : f))
      )
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ padding: '40px 20px', backgroundColor: 'var(--gray-50)', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: 32 }}>Manage freelancers and users</p>

        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          borderBottom: '1px solid var(--gray-300)',
        }}>
          <button
            onClick={() => setActiveTab('freelancers')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'freelancers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'freelancers' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            Freelancers {`(${freelancers.length})`}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'users' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'users' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            All Users {`(${users.length})`}
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-600)' }}>Loading...</div>}

        {activeTab === 'freelancers' && !loading && (
          <div>
            {freelancers.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 40,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                No freelancers yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {freelancers.map((freelancer) => (
                  <div key={freelancer.uid} style={{
                    backgroundColor: 'white',
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--gray-200)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                      <div>
                        <h3 style={{ marginBottom: 8 }}>{freelancer.displayName || 'Unnamed'}</h3>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: freelancer.verified ? 'var(--success-light)' : 'var(--danger-light)',
                          color: freelancer.verified ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {freelancer.verified ? '✓ Verified' : '✗ Not Verified'}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleVerified(freelancer.uid, freelancer.verified)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: freelancer.verified ? 'var(--danger)' : 'var(--success)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 13,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        {freelancer.verified ? 'Revoke' : 'Verify'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>Email</p>
                        <p style={{ fontWeight: 600 }}>{freelancer.email}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>Phone</p>
                        <p style={{ fontWeight: 600 }}>{freelancer.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>Categories</p>
                        <p style={{ fontWeight: 600 }}>{freelancer.categories.join(', ') || 'None'}</p>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                      <strong>Bio:</strong> {freelancer.bio || 'No bio provided'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && !loading && (
          <div>
            {users.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 40,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                No users yet.
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: 8,
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}>
                <table>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                      <th>Email</th>
                      <th>Display Name</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: 500 }}>{user.email}</td>
                        <td>{user.displayName || '-'}</td>
                        <td>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: user.role === 'admin' ? 'var(--danger-light)' : user.role === 'freelancer' ? 'var(--primary-light)' : 'var(--gray-200)',
                            color: user.role === 'admin' ? 'var(--danger)' : user.role === 'freelancer' ? 'var(--primary)' : 'var(--gray-700)',
                            display: 'inline-block',
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ color: 'var(--gray-600)', fontSize: 13 }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
