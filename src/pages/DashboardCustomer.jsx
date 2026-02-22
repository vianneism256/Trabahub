import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useLocation } from 'react-router-dom'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'

export default function DashboardCustomer() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'find-freelancers')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [freelancers, setFreelancers] = useState([])
  const [customerJobs, setCustomerJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    budget: '',
    categories: [],
    timeline: 'flexible',
  })

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state?.activeTab])

  useEffect(() => {
    loadCustomerJobs()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadFreelancers()
    } else {
      setFreelancers([])
    }
  }, [selectedCategory])

  async function loadCustomerJobs() {
    try {
      const jobs = await jobService.getJobsByCustomer(currentUser.uid)
      setCustomerJobs(jobs)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadFreelancers() {
    setLoading(true)
    try {
      const data = await freelancerService.getFreelancersByCategory(selectedCategory)
      const verified = data.filter((f) => f.verified)
      setFreelancers(verified)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function handleJobCategoryToggle(cat) {
    setJobForm((prev) => {
      const cats = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat]
      return { ...prev, categories: cats }
    })
  }

  async function handlePostJob(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (!jobForm.title || !jobForm.description || jobForm.categories.length === 0) {
        setMessage('Please fill all fields and select at least one category')
        setLoading(false)
        return
      }
      await jobService.createJob(currentUser.uid, jobForm)
      setMessage('✓ Job posted successfully!')
      setJobForm({ title: '', description: '', budget: '', categories: [], timeline: 'flexible' })
      await loadCustomerJobs()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(false)
  }

  async function handleCloseJob(jobId) {
    try {
      await jobService.updateJobStatus(jobId, 'closed')
      await loadCustomerJobs()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ padding: '40px 20px', backgroundColor: 'var(--gray-50)', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Post Job Tab */}
        {activeTab === 'post-job' && (
          <div style={{
            backgroundColor: 'white',
            padding: 32,
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            maxWidth: 800,
          }}>
            <h2 style={{ marginBottom: 24 }}>Post a New Job</h2>
            {message && (
              <div style={{
                padding: 12,
                marginBottom: 24,
                borderRadius: 6,
                backgroundColor: message.includes('Error') || message.includes('Please') ? 'var(--danger-light)' : 'var(--success-light)',
                color: message.includes('Error') || message.includes('Please') ? 'var(--danger)' : 'var(--success)',
                fontWeight: 600,
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handlePostJob}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Job Title</label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g., Fix kitchen sink leak"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Job Description</label>
                <textarea
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Describe what you need help with..."
                  style={{ padding: 12, border: '1px solid var(--gray-300)', borderRadius: 6, fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Budget (optional)</label>
                  <input
                    type="number"
                    value={jobForm.budget}
                    onChange={(e) => setJobForm({ ...jobForm, budget: e.target.value })}
                    placeholder="e.g., 150"
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Timeline</label>
                  <select value={jobForm.timeline} onChange={(e) => setJobForm({ ...jobForm, timeline: e.target.value })}>
                    <option value="flexible">Flexible</option>
                    <option value="urgent">Urgent (ASAP)</option>
                    <option value="this-week">This week</option>
                    <option value="this-month">This month</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>Required Skills/Categories</label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}>
                  {freelancerService.CATEGORIES.map((cat) => (
                    <label key={cat} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      border: '1px solid var(--gray-300)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: jobForm.categories.includes(cat) ? 'var(--primary-light)' : 'white',
                      borderColor: jobForm.categories.includes(cat) ? 'var(--primary)' : 'var(--gray-300)',
                    }}>
                      <input
                        type="checkbox"
                        checked={jobForm.categories.includes(cat)}
                        onChange={() => handleJobCategoryToggle(cat)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 500 }}>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: 'var(--success)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                {loading ? '⏳ Posting...' : '📤 Post Job'}
              </button>
            </form>
          </div>
        )}

        {/* My Jobs Tab */}
        {activeTab === 'my-jobs' && (
          <div>
            {customerJobs.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 40,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                <p style={{ fontSize: 16, marginBottom: 16 }}>No jobs posted yet</p>
                <button onClick={() => setActiveTab('post-job')} style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}>
                  Post your first job
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {customerJobs.map((job) => (
                  <div key={job.id} style={{
                    backgroundColor: 'white',
                    padding: 24,
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-sm)',
                    border: `2px solid ${job.status === 'closed' ? 'var(--gray-300)' : 'var(--primary)'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ marginBottom: 4 }}>{job.title}</h3>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: job.status === 'closed' ? 'var(--gray-200)' : 'var(--success-light)',
                          color: job.status === 'closed' ? 'var(--gray-700)' : 'var(--success)',
                        }}>
                          {job.status === 'closed' ? '🔒 Closed' : '🟢 Open'}
                        </span>
                      </div>
                      {job.status === 'open' && (
                        <button onClick={() => handleCloseJob(job.id)} style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}>
                          Close Job
                        </button>
                      )}
                    </div>

                    <p style={{ marginBottom: 12, color: 'var(--gray-700)' }}>{job.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                      {job.budget && (
                        <div>
                          <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>Budget</p>
                          <p style={{ fontWeight: 600, fontSize: 18 }}>${job.budget}</p>
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>Timeline</p>
                        <p style={{ fontWeight: 600 }}>{job.timeline}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>Applications</p>
                        <p style={{ fontWeight: 600 }}>{job.applications?.length || 0} received</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {job.categories.map((cat) => (
                        <span key={cat} style={{
                          padding: '4px 12px',
                          backgroundColor: 'var(--primary-light)',
                          color: 'var(--primary)',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Find Freelancers Tab */}
        {activeTab === 'find-freelancers' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 8,
              boxShadow: 'var(--shadow-sm)',
              marginBottom: 32,
            }}>
              <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>Select a Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '12px 16px',
                  fontSize: 16,
                  borderRadius: 6,
                  border: '1px solid var(--gray-300)',
                  maxWidth: 400,
                }}
              >
                <option value="">-- Choose a category --</option>
                {freelancerService.CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-600)' }}>Loading professionals...</div>}

            {!loading && freelancers.length === 0 && selectedCategory && (
              <div style={{
                textAlign: 'center',
                padding: 60,
                backgroundColor: 'white',
                borderRadius: 8,
                color: 'var(--gray-600)',
              }}>
                <p style={{ fontSize: 16 }}>No verified professionals available in this category yet.</p>
              </div>
            )}

            {freelancers.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 20,
              }}>
                {freelancers.map((freelancer) => (
                  <div key={freelancer.uid} style={{
                    backgroundColor: 'white',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                    border: '1px solid var(--gray-200)',
                  }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                    <div style={{ padding: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <h3 style={{ margin: 0, marginBottom: 4 }}>
                            {freelancer.displayName || 'Professional'}
                          </h3>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: 'var(--success-light)',
                            color: 'var(--success)',
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>✓ Verified</span>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: 'var(--primary-light)',
                        padding: 12,
                        borderRadius: 6,
                        marginBottom: 16,
                        color: 'var(--primary)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}>
                        {freelancer.categories.join(', ')}
                      </div>

                      <p style={{ color: 'var(--gray-700)', fontSize: 14, marginBottom: 16, minHeight: 40 }}>
                        {freelancer.bio || 'Professional with experience in their field'}
                      </p>

                      <div style={{
                        borderTop: '1px solid var(--gray-200)',
                        paddingTop: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        <a href={`mailto:${freelancer.email}`} style={{
                          display: 'block',
                          padding: '10px 12px',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 6,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: 14,
                          transition: 'background-color 0.2s',
                        }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-dark)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}>
                          📧 Email
                        </a>
                        {freelancer.phone && (
                          <a href={`tel:${freelancer.phone}`} style={{
                            display: 'block',
                            padding: '10px 12px',
                            backgroundColor: 'var(--gray-200)',
                            color: 'var(--gray-800)',
                            textDecoration: 'none',
                            borderRadius: 6,
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: 14,
                            transition: 'background-color 0.2s',
                          }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--gray-300)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--gray-200)'}>
                            📱 Call
                          </a>
                        )}
                      </div>
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
