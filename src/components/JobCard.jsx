import React, { useState } from 'react'
import { jobService } from '../services/jobService'
import { conversationService } from '../services/conversationService'
import { freelancerService } from '../services/freelancerService'
import { customerService } from '../services/customerService'

export default function JobCard({ job, currentUserId, onApply, userCategories = [], applicationStatus = null }) {
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [applied, setApplied] = useState(job.applications?.some((a) => a.freelancerId === currentUserId))

async function handleApply() {
    if (!message.trim()) {
      alert('Please enter a message')
      return
    }
    setLoading(true)
    try {
      await jobService.applyForJob(job.id, currentUserId, message)
      const [freelancerProfile, customerProfile] = await Promise.all([
        freelancerService.getProfile(currentUserId),
        customerService.getProfile(job.customerId),
      ])
      await conversationService.createConversation(
        job.id,
        job.title,
        currentUserId,
        [freelancerProfile?.firstName, freelancerProfile?.lastName].filter(Boolean).join(' ') || 'Freelancer',
        freelancerProfile?.photoURL || null,
        job.customerId,
        [customerProfile?.firstName, customerProfile?.lastName].filter(Boolean).join(' ') || 'Customer',
        customerProfile?.photoURL || null,
        message
      )
      setApplied(true)
      setMessage('')
      setShowApplyForm(false)
      onApply?.()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setLoading(false)
  }
async function handleWithdraw() {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return
    setLoading(true)
    try {
      await jobService.withdrawApplication(job.id, currentUserId)
      await conversationService.deleteConversation(job.id, currentUserId)
      setApplied(false)
      onApply?.()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setLoading(false)
  }


  const isRelevant = job.categories.some((c) => userCategories.includes(c))
  const borderColor = isRelevant ? 'var(--primary)' : 'var(--gray-200)'

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 8,
      boxShadow: 'var(--shadow-sm)',
      border: `2px solid ${borderColor}`,
      overflow: 'hidden',
      transition: 'all 0.2s',
      opacity: isRelevant ? 1 : 0.75,
    }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 8, color: 'var(--gray-900)' }}>{job.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-600)' }}>
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>
          {isRelevant ? (
            <span style={{
              display: 'inline-block',
              backgroundColor: 'var(--success-light)',
              color: 'var(--success)',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              Good Fit
            </span>
          ) : (
            <span style={{
              display: 'inline-block',
              backgroundColor: 'var(--gray-100)',
              color: 'var(--gray-500)',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              Not Your Field
            </span>
          )}
        </div>

        {/* Description */}
        <p style={{
          color: 'var(--gray-700)',
          marginBottom: 16,
          lineHeight: 1.5,
          fontSize: 14,
        }}>
          {job.description.substring(0, 150)}
          {job.description.length > 150 ? '...' : ''}
        </p>

        {/* Details Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 16,
          padding: '12px',
          backgroundColor: 'var(--gray-50)',
          borderRadius: 6,
        }}>
          {job.budget && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--gray-600)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
                Budget
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                ${job.budget}
              </p>
            </div>
          )}
          <div>
            <p style={{ fontSize: 11, color: 'var(--gray-600)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
              Timeline
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              {job.timeline || 'Flexible'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--gray-600)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
              Applications
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
              {job.applications?.length || 0}
            </p>
          </div>
        </div>

        {/* Categories */}
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}>
          {job.categories.map((cat) => {
            const isUserCategory = userCategories.includes(cat)
            return (
              <span key={cat} style={{
                padding: '6px 12px',
                backgroundColor: isUserCategory ? 'var(--primary-light)' : 'var(--gray-100)',
                color: isUserCategory ? 'var(--primary)' : 'var(--gray-700)',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {cat}
              </span>
            )
          })}
        </div>

        {/* Apply Button / Form */}
        {!applied ? (
          <>
            {!isRelevant ? (
              <button disabled style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'var(--gray-100)',
                color: 'var(--gray-400)',
                border: '1px solid var(--gray-200)',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'not-allowed',
                fontSize: 14,
              }}>
                Skills Don't Match
              </button>
            ) : !showApplyForm ? (
              <button onClick={() => setShowApplyForm(true)} style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s',
              }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-dark)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}>
                Apply Now
              </button>
            ) : (
              <div style={{
                backgroundColor: 'var(--primary-light)',
                padding: 16,
                borderRadius: 6,
              }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)', display: 'block', marginBottom: 8 }}>
                  Message to the client
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Introduce yourself and explain why you're a good fit..."
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 4,
                    border: '1px solid var(--primary)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    marginBottom: 8,
                    minHeight: 80,
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleApply} disabled={loading} style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'var(--success)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}>
                    {loading ? '⏳' : '✓'} Submit
                  </button>
                  <button onClick={() => { setShowApplyForm(false); setMessage(''); }} style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: 'var(--gray-200)',
                    color: 'var(--gray-800)',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 14,
              backgroundColor:
                applicationStatus === 'accepted' ? 'var(--success-light)' :
                applicationStatus === 'declined' ? 'var(--danger-light)' :
                applicationStatus === 'closed' ? 'var(--gray-100)' :
                'var(--success-light)',
              color:
                applicationStatus === 'accepted' ? 'var(--success)' :
                applicationStatus === 'declined' ? 'var(--danger)' :
                applicationStatus === 'closed' ? 'var(--gray-500)' :
                'var(--success)',
            }}>
              {applicationStatus === 'accepted' && '✓ Application Accepted!'}
              {applicationStatus === 'declined' && '✗ Application Declined'}
              {applicationStatus === 'closed' && 'Job Closed'}
              {applicationStatus === 'pending' && '⏳ Application Pending'}
              {!applicationStatus && '✓ Application Sent'}
            </div>
            {applicationStatus === 'pending' && (
              <button onClick={handleWithdraw} disabled={loading} style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}>
                {loading ? 'Withdrawing...' : 'Withdraw Application'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
