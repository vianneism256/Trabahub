import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useLocation, useNavigate } from 'react-router-dom'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'
import { conversationService } from '../services/conversationService'
import { reviewService } from '../services/reviewService'
import StarRating from '../components/StarRating'
import { customerService } from '../services/customerService'


export default function DashboardCustomer() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = location.state?.activeTab || 'find-freelancers'
  const [selectedCategory, setSelectedCategory] = useState('')
  const [freelancers, setFreelancers] = useState([])
  const [customerJobs, setCustomerJobs] = useState([])
  const [jobStatusFilter, setJobStatusFilter] = useState('all')
  const [jobSortOrder, setJobSortOrder] = useState('newest')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    budget: '',
    categories: [],
    timeline: 'flexible',
  })
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [filteredByJob, setFilteredByJob] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingFreelancer, setViewingFreelancer] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [reviewingConvId, setReviewingConvId] = useState(null)
  const [reviewSubmitted, setReviewSubmitted] = useState([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [assigningConvId, setAssigningConvId] = useState(null)
  const [confirmText, setConfirmText] = useState('')
  const [customerProfile, setCustomerProfile] = useState({
  displayName: '',
  email: '',
  phone: '',
})
const [isEditingProfile, setIsEditingProfile] = useState(false)
const [profileMessage, setProfileMessage] = useState('')
const [photoUploading, setPhotoUploading] = useState(false)
const [profileLoading, setProfileLoading] = useState(false)
const [selectedFile, setSelectedFile] = useState(null)
const [uploadingFile, setUploadingFile] = useState(false)
const fileInputRef = useRef(null)

  
  useEffect(() => {
    if (!currentUser) return

    // Real-time customer jobs listener
    const unsubJobs = jobService.listenToCustomerJobs(currentUser.uid, (data) => {
      setCustomerJobs(data)
    })

    // Real-time conversations listener
    const unsubConvs = conversationService.listenToCustomerConversations(
      currentUser.uid,
      (data) => setConversations(data)
    )

    return () => {
      unsubJobs()
      unsubConvs()
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedCategory === 'all') {
      loadAllFreelancers()
    } else if (selectedCategory) {
      loadFreelancers()
    } else {
      setFreelancers([])
    }
  }, [selectedCategory])




  useEffect(() => {
    if (!selectedConversation) return
    conversationService.markRead(selectedConversation.id, 'customer').catch(console.error)
    const unsubscribe = conversationService.listenToMessages(
      selectedConversation.id,
      (msgs) => setMessages(msgs)
    )
    return () => unsubscribe()
  }, [selectedConversation])




  useEffect(() => {
    if (!currentUser) return
    loadCustomerProfile()
  }, [currentUser])

  async function loadCustomerProfile() {
    try {
      const data = await customerService.getProfile(currentUser.uid)
      if (data) setCustomerProfile(data)
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

  async function loadAllFreelancers() {
    setLoading(true)
    try {
      const results = await Promise.all(
        freelancerService.CATEGORIES.map((cat) => freelancerService.getFreelancersByCategory(cat))
      )
      const all = results.flat()
      const unique = Array.from(new Map(all.map((f) => [f.uid, f])).values())
      setFreelancers(unique.filter((f) => f.verified))
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
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(false)
  }

  async function handleCloseJob(jobId) {
    try {
      await jobService.updateJobStatus(jobId, 'closed')
      await conversationService.closeConversationsByJob(jobId)
    } catch (err) {
      alert(`Failed to close job: ${err.message}`)
    }
  }





async function handleAccept(conversationId) {
    if (confirmText !== 'CONFIRM') {
      alert('Please type CONFIRM to assign this freelancer')
      return
    }
    try {
      await conversationService.updateStatus(conversationId, 'accepted')
      await jobService.updateJobStatus(selectedConversation.jobId, 'closed')
      await conversationService.closeOtherPendingConversations(selectedConversation.jobId, conversationId)
      setSelectedConversation((prev) => ({ ...prev, status: 'accepted' }))
      setAssigningConvId(null)
      setConfirmText('')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDecline(conversationId) {
    try {
      await conversationService.updateStatus(conversationId, 'declined')
      setSelectedConversation((prev) => ({ ...prev, status: 'declined' }))

    } catch (err) {
      console.error(err)
    }
  }

  async function handleSendMessage() {
    if (!selectedConversation) return
    if (!newMessage.trim() && !selectedFile) return

    setSendingMessage(true)
    try {
      if (selectedFile) {
        // Upload file and send message with file
        const fileData = await conversationService.uploadMessageFile(
          selectedConversation.id,
          currentUser.uid,
          selectedFile
        )
        await conversationService.sendMessageWithFile(
          selectedConversation.id,
          currentUser.uid,
          newMessage.trim(),
          fileData
        )
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        // Just send text message
        await conversationService.sendMessage(
          selectedConversation.id,
          currentUser.uid,
          newMessage
        )
      }
      setNewMessage('')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setSendingMessage(false)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Only PNG, JPG, GIF images and PDFs are allowed')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File must be under 10MB')
      return
    }

    setSelectedFile(file)
  }

  function handleFileRemove() {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleProfileChange(e) {
    const { name, value } = e.target
    setCustomerProfile((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSaveProfile() {
    setProfileLoading(true)
    setProfileMessage('')
    try {
      if (!customerProfile.displayName) {
        setProfileMessage('Please enter your name')
        setProfileLoading(false)
        return
      }
      await customerService.saveProfile(currentUser.uid, customerProfile)
      setProfileMessage('✓ Profile saved successfully!')
      setTimeout(() => setProfileMessage(''), 3000)
    } catch (err) {
      setProfileMessage(`Error: ${err.message}`)
    }
    setProfileLoading(false)
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB')
      return
    }
    setPhotoUploading(true)
    try {
      const url = await customerService.uploadProfilePhoto(currentUser.uid, file)
      setCustomerProfile((prev) => ({ ...prev, photoURL: url }))
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setPhotoUploading(false)
  }


  async function handleSubmitReview() {
    if (!reviewForm.rating) {
      alert('Please select a star rating')
      return
    }
    setReviewLoading(true)
    try {
      await reviewService.submitReview(
        selectedConversation.freelancerId,
        currentUser.uid,
        selectedConversation.jobId,
        selectedConversation.jobTitle,
        reviewForm.rating,
        reviewForm.comment
      )
      await conversationService.updateStatus(selectedConversation.id, 'closed')
      setSelectedConversation((prev) => ({ ...prev, status: 'closed' }))
      setReviewSubmitted((prev) => [...prev, selectedConversation.id])
      setReviewingConvId(null)
      setReviewForm({ rating: 0, comment: '' })
    } catch (err) {
      alert(err.message)
    }
    setReviewLoading(false)
  }

  function handleViewApplicants(jobId) {
    setFilteredByJob(jobId)
    navigate('/customer', { state: { activeTab: 'messages' } })
  }

  const AdPlaceholder = () => (
    <aside style={{ width: 160, flexShrink: 0, position: 'sticky', top: 80 }}>
      <div style={{
        width: 160,
        minHeight: 600,
        backgroundColor: 'white',
        borderRadius: 8,
        border: '2px dashed var(--gray-300)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--gray-400)',
        fontSize: 12,
        textAlign: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 24 }}></span>
        <span style={{ fontWeight: 600, color: 'var(--gray-500)' }}>Advertisement</span>
        <span style={{ fontSize: 10 }}>160 × 600</span>
      </div>
    </aside>
  )

  return (
    <div style={{ padding: '40px 20px', backgroundColor: 'var(--gray-50)', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ maxWidth: 1560, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <AdPlaceholder />
        <div style={{ flex: 1, minWidth: 0 }}>
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
                {loading ? 'Posting...' : 'Post Job'}
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
                <button onClick={() => navigate('/customer', { state: { activeTab: 'post-job' } })} style={{
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
            ) : (() => {
              const displayedJobs = customerJobs
                .filter((j) => jobStatusFilter === 'all' || j.status === jobStatusFilter)
                .sort((a, b) => {
                  const tA = new Date(a.createdAt).getTime()
                  const tB = new Date(b.createdAt).getTime()
                  return jobSortOrder === 'newest' ? tB - tA : tA - tB
                })
              return (
              <>
                {/* Filter + Sort bar */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '16px 20px',
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  {/* Status pills */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['all', 'All'], ['open', 'Open'], ['closed', 'Closed']].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setJobStatusFilter(val)}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 20,
                          border: '1.5px solid',
                          borderColor: jobStatusFilter === val ? 'var(--primary)' : 'var(--gray-300)',
                          backgroundColor: jobStatusFilter === val ? 'var(--primary)' : 'white',
                          color: jobStatusFilter === val ? 'white' : 'var(--gray-600)',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                        {val !== 'all' && (
                          <span style={{
                            marginLeft: 6,
                            backgroundColor: jobStatusFilter === val ? 'rgba(255,255,255,0.25)' : 'var(--gray-100)',
                            color: jobStatusFilter === val ? 'white' : 'var(--gray-500)',
                            borderRadius: 10,
                            padding: '1px 7px',
                            fontSize: 11,
                          }}>
                            {customerJobs.filter((j) => j.status === val).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 24, backgroundColor: 'var(--gray-200)' }} />

                  {/* Sort */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>Sort:</span>
                    <select
                      value={jobSortOrder}
                      onChange={(e) => setJobSortOrder(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1.5px solid var(--gray-300)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--gray-700)',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>

                  {/* Count */}
                  <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
                    {displayedJobs.length} of {customerJobs.length} job{customerJobs.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {displayedJobs.length === 0 ? (
                  <div style={{
                    backgroundColor: 'white',
                    padding: 40,
                    borderRadius: 8,
                    textAlign: 'center',
                    color: 'var(--gray-600)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No {jobStatusFilter} jobs</p>
                    <p style={{ fontSize: 13, margin: 0 }}>Try a different filter</p>
                  </div>
                ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                {displayedJobs.map((job) => (
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
                          {job.status === 'closed' ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleViewApplicants(job.id)} style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                        }}>
                          View Applicants
                        </button>
                        {job.status === 'open' && (
                          <button onClick={() => handleCloseJob(job.id)} style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                          }}>
                            Close Job
                          </button>
                        )}
                      </div>
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
              </>
              )
            })()}
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
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'end',
            }}>
              <div>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Select a Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: 16,
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    minWidth: 200,
                  }}
                >
                  <option value="">-- Choose a category --</option>
                  <option value="all">All Categories</option>
                  {freelancerService.CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Search by Name</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Juan dela Cruz..."
                  style={{
                    padding: '12px 16px',
                    fontSize: 16,
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    width: '100%',
                  }}
                />
              </div>
              {(searchQuery || selectedCategory) && (
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('') }} style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--gray-200)',
                  color: 'var(--gray-700)',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                }}>
                  Clear Filters
                </button>
              )}
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
                {freelancers
                  .filter((f) => 
                    f.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    f.bio?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((freelancer) => (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: 'var(--gray-200)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                          }}>
                            {freelancer.photoURL ? (
                              <img
                                src={freelancer.photoURL}
                                alt={freelancer.displayName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              '👤'
                            )}
                          </div>
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
                          {freelancer.averageRating && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                              <StarRating value={freelancer.averageRating} size={14} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>
                                {freelancer.averageRating} ({freelancer.totalReviews})
                              </span>
                            </div>
                          )}
                          </div>
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
                          <button onClick={() => setViewingFreelancer(freelancer)} style={{
                          display: 'block',
                          padding: '10px 12px',
                          backgroundColor: 'var(--secondary, #6b7280)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }} onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6575'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--secondary, #6b7280)'}>
                          View Profile
                        </button>
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
                          Email
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
                            Call
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

        {viewingFreelancer && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}>
            <div style={{
              width: '100%',
              maxWidth: 700,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'white',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              padding: 24,
              position: 'relative',
            }}>
              <button onClick={() => setViewingFreelancer(null)} style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--gray-700)',
                fontSize: 18,
                cursor: 'pointer',
              }}>
                ✕
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  backgroundColor: 'var(--gray-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}>
                  {viewingFreelancer.photoURL ? (
                    <img src={viewingFreelancer.photoURL} alt={viewingFreelancer.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : '👤'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24 }}>{viewingFreelancer.displayName || 'Freelancer'}</h2>
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--gray-600)' }}>{viewingFreelancer.categories?.join(', ') || 'No specialties listed'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 18, borderRadius: 12, backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</p>
                  <p style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 700 }}>{viewingFreelancer.averageRating ? viewingFreelancer.averageRating.toFixed(1) : '—'}</p>
                </div>
                <div style={{ padding: 18, borderRadius: 12, backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reviews</p>
                  <p style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 700 }}>{viewingFreelancer.totalReviews ?? 0}</p>
                </div>
                <div style={{ padding: 18, borderRadius: 12, backgroundColor: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jobs finished</p>
                  <p style={{ margin: '10px 0 0', fontSize: 22, fontWeight: 700 }}>{viewingFreelancer.completedJobs ?? 'N/A'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {viewingFreelancer.bio && (
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>About</p>
                    <p style={{ margin: '10px 0 0', color: 'var(--gray-700)', lineHeight: 1.7 }}>{viewingFreelancer.bio}</p>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                    <p style={{ margin: '10px 0 0', fontWeight: 600, color: 'var(--gray-900)' }}>{viewingFreelancer.email || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</p>
                    <p style={{ margin: '10px 0 0', fontWeight: 600, color: 'var(--gray-900)' }}>{viewingFreelancer.phone || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

{/* Messages Tab */}
        {activeTab === 'messages' && (
          <div style={{
            display: 'flex',
            height: 'calc(100vh - 180px)',
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            border: '1px solid var(--gray-200)',
          }}>
            {/* LEFT PANEL */}
            <div style={{
              width: 320,
              borderRight: '1px solid var(--gray-200)',
              overflowY: 'auto',
              flexShrink: 0,
            }}>
              <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid var(--gray-200)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {filteredByJob && (
                    <button onClick={() => {
                      setFilteredByJob(null)
                      setSelectedConversation(null)
                      navigate('/customer', { state: { activeTab: 'my-jobs' } })
                    }} style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary)',
                      fontSize: 20,
                      lineHeight: 1,
                      padding: '0 4px',
                      fontWeight: 700,
                    }}>
                      ←
                    </button>
                  )}
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Messages</h3>
                </div>
                {filteredByJob && (
                  <button onClick={() => setFilteredByJob(null)} style={{
                    fontSize: 12,
                    color: 'var(--primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}>
                    Show All
                  </button>
                )}
              </div>
              {conversations
                .filter((c) => filteredByJob ? c.jobId === filteredByJob : true)
                .length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
                  {filteredByJob ? 'No applicants for this job yet.' : 'No conversations yet.'}
                </div>
              ) : (
                conversations
                  .filter((c) => filteredByJob ? c.jobId === filteredByJob : true)
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--gray-100)',
                        cursor: 'pointer',
                        backgroundColor: selectedConversation?.id === conv.id ? 'var(--primary-light)' : 'white',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedConversation?.id !== conv.id)
                          e.currentTarget.style.backgroundColor = 'var(--gray-50)'
                      }}
                      onMouseLeave={(e) => {
                        if (selectedConversation?.id !== conv.id)
                          e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            overflow: 'hidden', backgroundColor: 'var(--gray-200)',
                            flexShrink: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 18,
                          }}>
                            {conv.freelancerPhoto
                              ? <img src={conv.freelancerPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : '👤'}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                              {conv.freelancerName || 'Freelancer'}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
                              {conv.jobTitle}
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 20,
                          backgroundColor:
                            conv.status === 'accepted' ? 'var(--success-light)' :
                            conv.status === 'declined' ? 'var(--danger-light)' :
                            'var(--gray-100)',
                          color:
                            conv.status === 'accepted' ? 'var(--success)' :
                            conv.status === 'declined' ? 'var(--danger)' :
                            'var(--gray-500)',
                        }}>
                          {conv.status === 'pending' ? 'Pending' :
                           conv.status === 'accepted' ? 'Accepted' :
                           conv.status === 'declined' ? 'Declined' :
                           conv.status === 'filled' ? 'Filled' :
                           'Closed'}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 13,
                        color: 'var(--gray-500)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  ))
              )}
            </div>
            {/* RIGHT PANEL */}
            {!selectedConversation ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gray-400)',
                fontSize: 15,
                flexDirection: 'column',
                gap: 12,
              }}>
                <span style={{ fontSize: 40 }}>💬</span>
                <p style={{ margin: 0 }}>Select a conversation to view the applicant</p>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        overflow: 'hidden', backgroundColor: 'var(--gray-200)',
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20,
                      }}>
                        {selectedConversation.freelancerPhoto
                          ? <img src={selectedConversation.freelancerPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '👤'}
                      </div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                        {selectedConversation.freelancerName || 'Freelancer'}
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
                      {selectedConversation.jobTitle} • {
                        selectedConversation.status === 'pending' ? 'Reviewing application' :
                        selectedConversation.status === 'accepted' ? '✓ Assigned' :
                        selectedConversation.status === 'declined' ? 'Declined' : 'Closed'
                      }
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 8 }}>
                    {selectedConversation.status === 'pending' && (
                      <>
                        {assigningConvId === selectedConversation.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              type="text"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder='Type CONFIRM to assign'
                              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--gray-300)', fontSize: 13, width: 180 }}
                            />
                            <button onClick={() => handleAccept(selectedConversation.id)} style={{ padding: '8px 16px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                              ✓ Confirm
                            </button>
                            <button onClick={() => { setAssigningConvId(null); setConfirmText('') }} style={{ padding: '8px 16px', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setAssigningConvId(selectedConversation.id)} style={{ padding: '8px 18px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            ✓ Assign Freelancer
                          </button>
                        )}
                        <button onClick={() => handleDecline(selectedConversation.id)} style={{ padding: '8px 18px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                          ✗ Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {(selectedConversation.status === 'closed' || selectedConversation.status === 'accepted') && !reviewSubmitted.includes(selectedConversation.id) && (
                  <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-200)', backgroundColor: 'var(--primary-light)' }}>
                    {reviewingConvId !== selectedConversation.id ? (
                      <button onClick={() => setReviewingConvId(selectedConversation.id)} style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                        ★ Leave a Review
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Rate this freelancer:</p>
                        <StarRating value={reviewForm.rating} onChange={(r) => setReviewForm((prev) => ({ ...prev, rating: r }))} size={28} />
                        <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))} placeholder="Leave a comment (optional)..." style={{ padding: 10, borderRadius: 6, border: '1px solid var(--gray-300)', fontFamily: 'inherit', fontSize: 13, minHeight: 70, resize: 'none' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={handleSubmitReview} disabled={reviewLoading} style={{ padding: '8px 16px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            {reviewLoading ? 'Submitting...' : 'Submit Review'}
                          </button>
                          <button onClick={() => setReviewingConvId(null)} style={{ padding: '8px 16px', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--gray-50)' }}>
                  {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {msg.text && (
                            <div style={{ padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', backgroundColor: isMe ? 'var(--primary)' : 'white', color: isMe ? 'white' : 'var(--gray-900)', fontSize: 14, lineHeight: 1.5, boxShadow: 'var(--shadow-sm)' }}>
                              {msg.text}
                            </div>
                          )}
                          {msg.file && (
                            msg.file.type?.startsWith('image/') ? (
                              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', maxWidth: 260 }}>
                                <img src={msg.file.url} alt={msg.file.name} style={{ width: '100%', display: 'block' }} />
                              </div>
                            ) : (
                              <a
                                href={msg.file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '10px 14px',
                                  backgroundColor: isMe ? 'var(--primary)' : 'white',
                                  color: isMe ? 'white' : 'var(--gray-900)',
                                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                  textDecoration: 'none',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  boxShadow: 'var(--shadow-sm)',
                                }}
                              >
                                📎 {msg.file.name}
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: 'white' }}>
                  {selectedFile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', backgroundColor: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--primary)' }}>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>📎 {selectedFile.name}</div>
                      <button onClick={handleFileRemove} style={{ padding: '4px 12px', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {selectedConversation.status === 'closed' || selectedConversation.status === 'declined' ? (
                      <div style={{ flex: 1, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, padding: '10px' }}>
                        {selectedConversation.status === 'declined' && 'This application was declined.'}
                        {selectedConversation.status === 'closed' && 'This job is closed.'}
                      </div>
                    ) : (
                      <>
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--gray-300)', fontSize: 14, outline: 'none' }} />
                        <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".png,.jpg,.jpeg,.gif,.pdf" style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 16px', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 14 }} title="Attach image or PDF">📎</button>
                        <button onClick={handleSendMessage} disabled={sendingMessage} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                          {sendingMessage ? '...' : 'Send'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Profile Tab — FIXED: now inside the wrapper */}
        {activeTab === 'my-profile' && (
          <div>
            {!isEditingProfile ? (
              <div style={{ backgroundColor: 'white', padding: 32, borderRadius: 8, boxShadow: 'var(--shadow-sm)', maxWidth: 800 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ margin: 0 }}>Your Profile</h2>
                  <button onClick={() => setIsEditingProfile(true)} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    Edit Profile
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      {customerProfile.photoURL ? <img src={customerProfile.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Profile Photo</p>
                      <label style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-block' }}>
                        {photoUploading ? 'Uploading...' : customerProfile.photoURL ? 'Change Photo' : 'Upload Photo'}
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoUploading} style={{ display: 'none' }} />
                      </label>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>Max 5MB. JPG, PNG, or GIF.</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Name</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>{customerProfile.displayName || '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Email</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>{customerProfile.email || '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Phone</p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      {customerProfile.phone ? <a href={`tel:${customerProfile.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{customerProfile.phone}</a> : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', padding: 32, borderRadius: 8, boxShadow: 'var(--shadow-sm)', maxWidth: 800 }}>
                <h2 style={{ marginBottom: 24 }}>Edit Your Profile</h2>
                {profileMessage && (
                  <div style={{ padding: 12, marginBottom: 24, borderRadius: 6, backgroundColor: profileMessage.includes('Error') || profileMessage.includes('Please') ? 'var(--danger-light)' : 'var(--success-light)', color: profileMessage.includes('Error') || profileMessage.includes('Please') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                    {profileMessage}
                  </div>
                )}
                <div style={{ display: 'grid', gap: 24 }}>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Display Name</label>
                    <input type="text" name="displayName" value={customerProfile.displayName} onChange={handleProfileChange} placeholder="Your name" />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Email</label>
                    <input type="email" name="email" value={customerProfile.email} onChange={handleProfileChange} placeholder="your@email.com" />
                  </div>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Phone (optional)</label>
                    <input type="tel" name="phone" value={customerProfile.phone} onChange={handleProfileChange} placeholder="(555) 123-4567" />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleSaveProfile} disabled={profileLoading} style={{ flex: 1, padding: '14px 24px', backgroundColor: 'var(--success)', color: 'white', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                      {profileLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button onClick={() => { setIsEditingProfile(false); setProfileMessage('') }} style={{ flex: 1, padding: '14px 24px', backgroundColor: 'var(--gray-200)', color: 'var(--gray-800)', border: 'none', borderRadius: 6, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        </div>
        <AdPlaceholder />
      </div>
    </div>
  )
}
