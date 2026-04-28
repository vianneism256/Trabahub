import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useLocation } from 'react-router-dom'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'
import { conversationService } from '../services/conversationService'
import JobCard from '../components/JobCard'
import { reviewService } from '../services/reviewService'
import StarRating from '../components/StarRating'

export default function DashboardFreelancer() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'jobs-feed')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    categories: [],
  })
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef(null)
  const [reviews, setReviews] = useState([])
  const [photoUploading, setPhotoUploading] = useState(false)


  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state?.activeTab])

  useEffect(() => {
    if (!currentUser) return
    loadProfile()

    // Real-time jobs listener
    const unsubJobs = jobService.listenToOpenJobs((allJobs) => {
      setJobs(allJobs)
      const myApps = allJobs.reduce((acc, job) => {
        const userApps = job.applications?.filter((a) => a.freelancerId === currentUser.uid) || []
        return [...acc, ...userApps.map(() => job.id)]
      }, [])
      setMyApplications(myApps)
    })

    // Real-time conversations listener
    const unsubConvs = conversationService.listenToFreelancerConversations(
      currentUser.uid,
      (data) => setConversations(data)
    )

    return () => {
      unsubJobs()
      unsubConvs()
    }
  }, [currentUser])

  useEffect(() => {
    filterJobs()
  }, [jobs, selectedCategory, profile])

  async function loadProfile() {
    try {
      const data = await freelancerService.getProfile(currentUser.uid)
      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error(err)
    }
  }



  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!selectedConversation) return
    // Real-time listener — unsubscribes when conversation changes
    const unsubscribe = conversationService.listenToMessages(
      selectedConversation.id,
      (msgs) => setMessages(msgs)
    )
    return () => unsubscribe()
  }, [selectedConversation])

  useEffect(() => {
    if (!currentUser) return
    const unsubReviews = reviewService.listenToFreelancerReviews(
      currentUser.uid,
      (data) => setReviews(data)
    )
    return () => unsubReviews()
  }, [currentUser])



  function filterJobs() {
    let filtered = jobs
    if (selectedCategory) {
      filtered = filtered.filter((job) => job.categories.includes(selectedCategory))
    }
    setFilteredJobs(filtered)
  }



  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedConversation) return
    setSendingMessage(true)
    try {
      await conversationService.sendMessage(
        selectedConversation.id,
        currentUser.uid,
        newMessage
      )
      setNewMessage('')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setSendingMessage(false)
  }

  function handleProfileChange(e) {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  function handleCategoryToggle(cat) {
    setProfile((prev) => {
      const cats = prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat]
      return { ...prev, categories: cats }
    })
  }

  async function handleSaveProfile() {
    setLoading(true)
    setMessage('')
    try {
      if (!profile.displayName || profile.categories.length === 0) {
        setMessage('Please fill in at least your name and select at least one category')
        setLoading(false)
        return
      }
      await freelancerService.saveProfile(currentUser.uid, profile)
      setMessage('✓ Profile saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
    setLoading(false)
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
      const url = await freelancerService.uploadProfilePhoto(currentUser.uid, file)
      setProfile((prev) => ({ ...prev, photoURL: url }))
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setPhotoUploading(false)
  }

  return (
    <div style={{ padding: '40px 20px', backgroundColor: 'var(--gray-50)', minHeight: 'calc(100vh - 120px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Jobs Feed Tab */}
        {activeTab === 'jobs-feed' && (
          <div>
            {/* Filter */}
            <div style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 8,
              boxShadow: 'var(--shadow-sm)',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'end',
              gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block', fontSize: 14 }}>
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: '1px solid var(--gray-300)',
                    width: '100%',
                    maxWidth: 300,
                  }}
                >
                  <option value="">All Categories</option>
                  {profile.categories.length > 0 ? (
                    profile.categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  ) : (
                    freelancerService.CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                  )}
                </select>
              </div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)', fontWeight: 600 }}>
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
              </div>
            </div>

            {/* Jobs Grid */}
            {filteredJobs.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 60,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>No jobs available right now</p>
                <p style={{ fontSize: 14 }}>Check back soon or complete your profile to see more relevant opportunities</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20,
              }}>
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    currentUserId={currentUser.uid}
                    userCategories={profile.categories}
                    onApply={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Applications Tab */}
        {activeTab === 'my-applications' && (
          <div>
            {jobs.filter((j) => myApplications.includes(j.id)).length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 60,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
              }}>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>No applications yet</p>
                <p style={{ fontSize: 14, marginBottom: 24 }}>Start applying to jobs from the feed!</p>
                <button onClick={() => setActiveTab('jobs-feed')} style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}>
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 20,
              }}>
                {jobs
                  .filter((j) => myApplications.includes(j.id))
                  .map((job) => {
                    const conv = conversations.find((c) => c.jobId === job.id)
                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        currentUserId={currentUser.uid}
                        userCategories={profile.categories}
                        onApply={() => {}}
                        applicationStatus={conv?.status || 'pending'}
                      />
                    )
                  })}
              </div>
            )}
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

            {/* LEFT PANEL — conversation list */}
            <div style={{
              width: 320,
              borderRight: '1px solid var(--gray-200)',
              overflowY: 'auto',
              flexShrink: 0,
            }}>
              <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid var(--gray-200)',
              }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Messages</h3>
              </div>

              {conversations.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
                  No conversations yet. Apply to a job to start one!
                </div>
              ) : (
                conversations.map((conv) => (
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
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                        {conv.jobTitle}
                      </p>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 20,
                        backgroundColor:
                          conv.status === 'accepted' ? 'var(--success-light)' :
                          conv.status === 'declined' ? 'var(--danger-light)' :
                          conv.status === 'closed' ? 'var(--gray-100)' :
                          'var(--gray-100)',
                        color:
                          conv.status === 'accepted' ? 'var(--success)' :
                          conv.status === 'declined' ? 'var(--danger)' :
                          conv.status === 'closed' ? 'var(--gray-500)' :
                          'var(--gray-500)',
                      }}>
                        {conv.status === 'pending' ? 'Pending' :
                         conv.status === 'accepted' ? 'Accepted' :
                         conv.status === 'declined' ? 'Declined' :
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

            {/* RIGHT PANEL — chat window */}
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
                <p style={{ margin: 0 }}>Select a conversation to start chatting</p>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Chat header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                      {selectedConversation.jobTitle}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
                      {selectedConversation.status === 'pending' && 'Waiting for customer to accept...'}
                      {selectedConversation.status === 'accepted' && '✓ Customer accepted your application'}
                      {selectedConversation.status === 'declined' && 'Customer declined this application'}
                      {selectedConversation.status === 'closed' && 'This job has been closed'}
                    </p>
                  </div>
                </div>

                {/* Messages area */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  backgroundColor: 'var(--gray-50)',
                }}>
                  {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.uid
                    return (
                      <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                      }}>
                        <div style={{
                          maxWidth: '65%',
                          padding: '10px 14px',
                          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backgroundColor: isMe ? 'var(--primary)' : 'white',
                          color: isMe ? 'white' : 'var(--gray-900)',
                          fontSize: 14,
                          lineHeight: 1.5,
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--gray-200)',
                  display: 'flex',
                  gap: 10,
                  backgroundColor: 'white',
                }}>
                  {selectedConversation.status === 'closed' || selectedConversation.status === 'declined' ? (
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      color: 'var(--gray-400)',
                      fontSize: 13,
                      padding: '10px',
                    }}>
                      {selectedConversation.status === 'closed' ? 'This job is closed.' : 'This application was declined.'}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 20,
                          border: '1px solid var(--gray-300)',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 20,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        {sendingMessage ? '...' : 'Send'}
                      </button>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* Edit Profile Tab */}
        {activeTab === 'my-profile' && (
          <div>
            {!isEditingProfile ? (
              // Read-only profile view
              <div style={{
                backgroundColor: 'white',
                padding: 32,
                borderRadius: 8,
                boxShadow: 'var(--shadow-sm)',
                maxWidth: 800,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ margin: 0 }}>Your Profile</h2>
                  <button onClick={() => setIsEditingProfile(true)} style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                  }}>
                    Edit Profile
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 24 }}>

                  {/* Profile Photo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: 'var(--gray-200)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                    }}>
                      {profile.photoURL ? (
                        <img
                          src={profile.photoURL}
                          alt="Profile"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Profile Photo</p>
                      <label style={{
                        padding: '8px 16px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        {photoUploading ? 'Uploading...' : profile.photoURL ? 'Change Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={photoUploading}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                        Max 5MB. JPG, PNG, or GIF.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Name
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      {profile.displayName || '—'}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Email
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      {profile.email || '—'}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Phone
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', margin: 0 }}>
                      {profile.phone ? <a href={`tel:${profile.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{profile.phone}</a> : '—'}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Bio
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>
                      {profile.bio || '—'}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
                      Specialties
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {profile.categories && profile.categories.length > 0 ? (
                        profile.categories.map((cat) => (
                          <span key={cat} style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 20,
                            fontSize: 13,
                            fontWeight: 600,
                          }}>
                            {cat}
                          </span>
                        ))
                      ) : (
                        <p style={{ color: 'var(--gray-600)' }}>No specialties selected yet</p>
                      )}
                    </div>
                  </div>

                  {/* Reviews section */}
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
                      Reviews {reviews.length > 0 && `(${reviews.length})`}
                    </p>
                    {profile.averageRating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <StarRating value={profile.averageRating} size={20} />
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{profile.averageRating}</span>
                        <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>({profile.totalReviews} review{profile.totalReviews !== 1 ? 's' : ''})</span>
                      </div>
                    )}
                    {reviews.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No reviews yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {reviews.map((review) => (
                          <div key={review.id} style={{
                            padding: 16,
                            backgroundColor: 'var(--gray-50)',
                            borderRadius: 8,
                            border: '1px solid var(--gray-200)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <StarRating value={review.rating} size={16} />
                              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--gray-700)', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                              {review.jobTitle}
                            </p>
                            {review.comment && (
                              <p style={{ fontSize: 14, color: 'var(--gray-800)', margin: '8px 0 0 0' }}>
                                "{review.comment}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Edit profile view
              <div style={{
                backgroundColor: 'white',
                padding: 32,
                borderRadius: 8,
                boxShadow: 'var(--shadow-sm)',
                maxWidth: 800,
              }}>
                <h2 style={{ marginBottom: 24 }}>Edit Your Profile</h2>

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

                <div style={{ display: 'grid', gap: 24 }}>
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Display Name</label>
                    <input
                      type="text"
                      name="displayName"
                      value={profile.displayName}
                      onChange={handleProfileChange}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Phone (optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Bio</label>
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell customers about yourself and your experience..."
                      style={{
                        padding: 12,
                        border: '1px solid var(--gray-300)',
                        borderRadius: 6,
                        fontFamily: 'inherit',
                        minHeight: 120,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>Your Specialties</label>
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
                          backgroundColor: profile.categories.includes(cat) ? 'var(--primary-light)' : 'white',
                          borderColor: profile.categories.includes(cat) ? 'var(--primary)' : 'var(--gray-300)',
                        }}>
                          <input
                            type="checkbox"
                            checked={profile.categories.includes(cat)}
                            onChange={() => handleCategoryToggle(cat)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 500 }}>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleSaveProfile} disabled={loading} style={{
                      flex: 1,
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
                      {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button onClick={() => { setIsEditingProfile(false); setMessage(''); }} style={{
                      flex: 1,
                      padding: '14px 24px',
                      backgroundColor: 'var(--gray-200)',
                      color: 'var(--gray-800)',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
