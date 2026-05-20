import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'
import { certificationService } from '../services/certificationService'
import { kycService } from '../services/kycService'
import { connectService } from '../services/connectService'

export default function DashboardAdmin() {
  const [freelancers, setFreelancers] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('kyc')
  const [jobs, setJobs] = useState([])
  const [editLogs, setEditLogs] = useState([])
  const [selectedLogId, setSelectedLogId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [kycSubmissions, setKycSubmissions] = useState([])
  const [kycSelectedId, setKycSelectedId] = useState(null)
  const [kycRejectionReason, setKycRejectionReason] = useState('')
  const [connectPurchases, setConnectPurchases] = useState([])
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null)
  const [purchaseRejectionReason, setPurchaseRejectionReason] = useState('')

useEffect(() => {
    setLoading(true)

    async function loadAdminData() {
      try {
        const freelancers = await freelancerService.getAllFreelancers()
        const { data: userRows, error: usersError } = await supabase.from('users').select('*')
        const { data: jobRows, error: jobsError } = await supabase.from('jobs').select('*')

        if (usersError) throw usersError
        if (jobsError) throw jobsError

        setFreelancers(freelancers)
        setUsers(userRows.map((user) => ({
          ...user,
          uid: user.firebase_uid,
          createdAt: user.created_at,
        })))
        setJobs(jobRows)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()

    const unsubEditLogs = certificationService.listenToPendingEditLogs((logs) => {
      setEditLogs(logs)
    })

    const unsubKyc = kycService.listenToPendingKyc((submissions) => {
      setKycSubmissions(submissions)
    })

    const unsubPurchases = connectService.listenToPendingPurchases((purchases) => {
      setConnectPurchases(purchases)
    })

    return () => {
      unsubEditLogs()
      unsubKyc()
      unsubPurchases()
    }
  }, [])

  async function handleApprovePurchase(purchase) {
    try {
      await connectService.approvePurchase(purchase.id, purchase.user_id, purchase.user_role, purchase.package_connects)
      setConnectPurchases(prev => prev.filter(p => p.id !== purchase.id))
      setSelectedPurchaseId(null)
      alert(`✓ Approved! ${purchase.package_connects} connects added to ${purchase.firstName || purchase.user_id}`)
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  async function handleRejectPurchase(purchase) {
    if (!purchaseRejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    try {
      await connectService.rejectPurchase(purchase.id, purchase.user_id, purchaseRejectionReason)
      setConnectPurchases(prev => prev.filter(p => p.id !== purchase.id))
      setSelectedPurchaseId(null)
      setPurchaseRejectionReason('')
      alert('❌ Purchase rejected')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
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

  async function handleVerifyKyc(uid, role) {
    try {
      await kycService.verifyKyc(uid, role)
      setKycSubmissions(prev => prev.filter(s => s.uid !== uid))
      setKycSelectedId(null)
      alert('✓ Identity verified successfully!')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  async function handleRejectKyc(uid, role) {
    if (!kycRejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    try {
      await kycService.rejectKyc(uid, role, kycRejectionReason)
      setKycSubmissions(prev => prev.filter(s => s.uid !== uid))
      setKycSelectedId(null)
      setKycRejectionReason('')
      alert('❌ Identity verification rejected')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  async function handleVerifyCertification(logId, certId) {
    try {
      await certificationService.verifyCertification(certId, 'admin')
      await certificationService.markEditLogReviewed(logId)
      setEditLogs((prev) => prev.filter((log) => log.id !== logId))
      setSelectedLogId(null)
      alert('✓ Certification verified successfully!')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  async function handleRejectCertification(logId, certId) {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    try {
      await certificationService.rejectCertification(certId, 'admin', rejectionReason)
      await certificationService.markEditLogReviewed(logId)
      setEditLogs((prev) => prev.filter((log) => log.id !== logId))
      setSelectedLogId(null)
      setRejectionReason('')
      alert('❌ Certification rejected')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '40px 20px', backgroundColor: 'var(--gray-50)', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1>Admin Dashboard</h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: 32 }}>Manage freelancers and users</p>

        {/* Stats Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Total Users
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
              {users.length}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Total Freelancers
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              {freelancers.length}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Verified Freelancers
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              {freelancers.filter((f) => f.verified).length}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Open Jobs
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              {jobs.filter((j) => j.status === 'open').length}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Closed Jobs
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--gray-500)', margin: 0 }}>
              {jobs.filter((j) => j.status === 'closed').length}
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--gray-200)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
              Total Customers
            </p>
            <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
              {users.filter((u) => u.role === 'customer').length}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          borderBottom: '1px solid var(--gray-300)',
        }}>
          <button
            onClick={() => setActiveTab('kyc')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'kyc' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'kyc' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            KYC Verification
            {kycSubmissions.length > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: 8,
                backgroundColor: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {kycSubmissions.length}
              </span>
            )}
          </button>
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
          <button
            onClick={() => setActiveTab('edit-logs')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'edit-logs' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'edit-logs' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            Verify Certifications
            {editLogs.length > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: 8,
                backgroundColor: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {editLogs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('connect-purchases')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'connect-purchases' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'connect-purchases' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            Connect Purchases
            {connectPurchases.length > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: 8,
                backgroundColor: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {connectPurchases.length}
              </span>
            )}
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-600)' }}>Loading...</div>}

        {/* KYC Verification Tab */}
        {activeTab === 'kyc' && !loading && (
          <div>
            {kycSubmissions.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: 40, borderRadius: 8, textAlign: 'center', color: 'var(--gray-600)' }}>
                <p style={{ fontSize: 40, margin: '0 0 12px 0' }}>✅</p>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No pending KYC submissions</p>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>All submitted IDs have been reviewed</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {kycSubmissions.map((sub) => (
                  <div key={sub.uid} style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-sm)',
                    border: '2px solid var(--primary-light)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: 24 }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--gray-200)' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: 'var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
                          {sub.photoUrl ? (
                            <img src={sub.photoUrl} alt={sub.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : '👤'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                              {[sub.firstName, sub.lastName].filter(Boolean).join(' ') || 'Unknown'}
                            </p>
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: sub.role === 'freelancer' ? 'var(--primary-light)' : 'var(--gray-200)',
                              color: sub.role === 'freelancer' ? 'var(--primary)' : 'var(--gray-700)',
                              textTransform: 'capitalize',
                            }}>
                              {sub.role}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: 0 }}>{sub.email}</p>
                        </div>
                      </div>

                      {/* ID Image */}
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 10 }}>🪪 Submitted Government ID</p>
                        <div style={{ borderRadius: 8, overflow: 'hidden', maxWidth: 360, border: '1px solid var(--gray-200)' }}>
                          <img src={sub.idImageUrl} alt="Government ID" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
                        </div>
                      </div>

                      {/* Actions */}
                      {kycSelectedId !== sub.uid ? (
                        <button
                          onClick={() => setKycSelectedId(sub.uid)}
                          style={{ padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                        >
                          Review
                        </button>
                      ) : (
                        <div style={{ padding: 16, backgroundColor: 'var(--gray-50)', borderRadius: 8, borderTop: '2px solid var(--primary)', marginTop: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>What would you like to do?</p>
                          <div style={{ display: 'grid', gap: 12 }}>
                            <textarea
                              value={kycRejectionReason}
                              onChange={(e) => setKycRejectionReason(e.target.value)}
                              placeholder="If rejecting, explain why (optional for approval)..."
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, minHeight: 80, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 12 }}>
                              <button
                                onClick={() => handleVerifyKyc(sub.uid, sub.role)}
                                style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                              >
                                ✓ Verify Identity
                              </button>
                              <button
                                onClick={() => handleRejectKyc(sub.uid, sub.role)}
                                style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                              >
                                ❌ Reject
                              </button>
                              <button
                                onClick={() => { setKycSelectedId(null); setKycRejectionReason('') }}
                                style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--gray-300)', color: 'var(--gray-700)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                        <h3 style={{ marginBottom: 8 }}>{[freelancer.firstName, freelancer.lastName].filter(Boolean).join(' ') || 'Unnamed'}</h3>
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
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid}>
                        <td style={{ fontWeight: 500 }}>{user.email}</td>
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

        {/* Edit Logs / Certification Verification Tab */}
        {activeTab === 'edit-logs' && !loading && (
          <div>
            {editLogs.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 40,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No pending certifications to review</p>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>All freelancer submissions have been verified</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {editLogs.map((log) => (
                  <div key={log.id} style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-sm)',
                    border: '2px solid var(--primary-light)',
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: 24 }}>
                      {/* Header with freelancer info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--gray-200)' }}>
                        <div style={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: 'var(--gray-200)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          overflow: 'hidden',
                        }}>
                          {log.freelancerPhoto ? (
                            <img src={log.freelancerPhoto} alt={log.freelancerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            '👤'
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>{log.freelancerName}</p>
                          <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '0 0 4px 0' }}>{log.freelancerEmail}</p>
                          <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>
                            Submitted {new Date(log.createdAt.toDate ? log.createdAt.toDate() : log.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Certification details */}
                      {log.changeType === 'certification_added' && log.details && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                            📜 {log.details.certificationTitle}
                          </p>
                          <div style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            maxWidth: 300,
                            marginBottom: 16,
                          }}>
                            <img
                              src={log.details.certificationImage}
                              alt={log.details.certificationTitle}
                              style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {selectedLogId !== log.id ? (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button
                            onClick={() => setSelectedLogId(log.id)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              backgroundColor: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: 14,
                            }}
                          >
                            Review
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          padding: 16,
                          backgroundColor: 'var(--gray-50)',
                          borderRadius: 8,
                          borderTop: '2px solid var(--primary)',
                          marginTop: 12,
                        }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                            What would you like to do?
                          </p>
                          <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                              <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="If rejecting, explain why (optional for approval)..."
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  border: '1px solid var(--gray-300)',
                                  borderRadius: 6,
                                  fontFamily: 'inherit',
                                  fontSize: 13,
                                  minHeight: 80,
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <button
                                onClick={() => handleVerifyCertification(log.id, log.details.certificationId)}
                                style={{
                                  flex: 1,
                                  padding: '12px 16px',
                                  backgroundColor: 'var(--success)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                }}
                              >
                                ✓ Verify
                              </button>
                              <button
                                onClick={() => handleRejectCertification(log.id, log.details.certificationId)}
                                style={{
                                  flex: 1,
                                  padding: '12px 16px',
                                  backgroundColor: 'var(--danger)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                }}
                              >
                                ❌ Reject
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLogId(null)
                                  setRejectionReason('')
                                }}
                                style={{
                                  flex: 1,
                                  padding: '12px 16px',
                                  backgroundColor: 'var(--gray-300)',
                                  color: 'var(--gray-700)',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Connect Purchases Tab */}
        {activeTab === 'connect-purchases' && !loading && (
          <div>
            {connectPurchases.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: 40, borderRadius: 8, textAlign: 'center', color: 'var(--gray-600)' }}>
                <p style={{ fontSize: 40, margin: '0 0 12px 0' }}>✅</p>
                <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No pending connect purchases</p>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>All receipts have been reviewed</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {connectPurchases.map((purchase) => (
                  <div key={purchase.id} style={{ backgroundColor: 'white', borderRadius: 8, boxShadow: 'var(--shadow-sm)', border: '2px solid var(--primary-light)', overflow: 'hidden' }}>
                    <div style={{ padding: 24 }}>
                      {/* User info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--gray-200)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden' }}>
                          {purchase.photoUrl
                            ? <img src={purchase.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '👤'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                              {[purchase.firstName, purchase.lastName].filter(Boolean).join(' ') || purchase.user_id.substring(0, 8) + '...'}
                            </p>
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, backgroundColor: purchase.user_role === 'freelancer' ? 'var(--primary-light)' : 'var(--gray-200)', color: purchase.user_role === 'freelancer' ? 'var(--primary)' : 'var(--gray-700)', textTransform: 'capitalize' }}>
                              {purchase.user_role}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: 0 }}>{purchase.email}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>+{purchase.package_connects}</p>
                          <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '4px 0 0 0' }}>connects</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)', margin: '4px 0 0 0' }}>₱{purchase.package_price}</p>
                        </div>
                      </div>

                      {/* Receipt image */}
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 10 }}>💳 Payment Receipt</p>
                        <div style={{ borderRadius: 8, overflow: 'hidden', maxWidth: 360, border: '1px solid var(--gray-200)' }}>
                          <img src={purchase.receipt_url} alt="Receipt" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', backgroundColor: 'var(--gray-50)' }} />
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                          Submitted {new Date(purchase.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Actions */}
                      {selectedPurchaseId !== purchase.id ? (
                        <button
                          onClick={() => setSelectedPurchaseId(purchase.id)}
                          style={{ padding: '12px 24px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                        >
                          Review
                        </button>
                      ) : (
                        <div style={{ padding: 16, backgroundColor: 'var(--gray-50)', borderRadius: 8, borderTop: '2px solid var(--primary)', marginTop: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>Verify this payment?</p>
                          <textarea
                            value={purchaseRejectionReason}
                            onChange={(e) => setPurchaseRejectionReason(e.target.value)}
                            placeholder="If rejecting, explain why..."
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, minHeight: 70, boxSizing: 'border-box', marginBottom: 12 }}
                          />
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              onClick={() => handleApprovePurchase(purchase)}
                              style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                            >
                              ✓ Approve — Add {purchase.package_connects} Connects
                            </button>
                            <button
                              onClick={() => handleRejectPurchase(purchase)}
                              style={{ flex: 1, padding: '12px 16px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                            >
                              ❌ Reject
                            </button>
                            <button
                              onClick={() => { setSelectedPurchaseId(null); setPurchaseRejectionReason('') }}
                              style={{ padding: '12px 16px', backgroundColor: 'var(--gray-300)', color: 'var(--gray-700)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
