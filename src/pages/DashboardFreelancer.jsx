import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useLocation, useNavigate } from 'react-router-dom'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'
import { conversationService } from '../services/conversationService'
import { certificationService } from '../services/certificationService'
import JobCard from '../components/JobCard'
import { reviewService } from '../services/reviewService'
import StarRating from '../components/StarRating'
import { notificationService } from '../services/notificationService'
import { kycService } from '../services/kycService'
import { connectService } from '../services/connectService'

export default function DashboardFreelancer() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = location.state?.activeTab || 'jobs-feed'
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
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
  const [certifications, setCertifications] = useState([])
  const [verifiedCategories, setVerifiedCategories] = useState([])
  const [uploadingCert, setUploadingCert] = useState(false)
  const [newCertCategory, setNewCertCategory] = useState('')
  const [certFileInput, setCertFileInput] = useState(null)
  const certFileRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const [uploadingKyc, setUploadingKyc] = useState(false)
  const kycFileRef = useRef(null)
  const [connects, setConnects] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [receiptFile, setReceiptFile] = useState(null)
  const [submittingPurchase, setSubmittingPurchase] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)
  const receiptFileRef = useRef(null)


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
  }, [jobs, selectedCategory, verifiedCategories])

  async function loadProfile() {
    try {
      const data = await freelancerService.getProfile(currentUser.uid)
      if (data) {
        setProfile(data)
      }
      // Load certifications
      const certs = await certificationService.getCertificationsByFreelancer(currentUser.uid)
      setCertifications(certs)
      setVerifiedCategories(certs.filter(c => c.status === 'verified').map(c => c.title))
      // Load connect balance
      const bal = await connectService.getBalance(currentUser.uid, 'freelancer')
      setConnects(bal)
    } catch (err) {
      console.error(err)
    }
  }



  useEffect(() => {
    if (messagesEndRef.current && activeTab === 'messages') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  useEffect(() => {
    if (!selectedConversation) return
    conversationService.markRead(selectedConversation.id, 'freelancer').catch(console.error)
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

  useEffect(() => {
    if (!currentUser) return
    const unsubNotifs = notificationService.listenToNotifications(
      currentUser.uid,
      (data) => setNotifications(data)
    )
    return () => unsubNotifs()
  }, [currentUser])



  function filterJobs() {
    let filtered = jobs.filter((job) =>
      job.categories.some((c) => verifiedCategories.includes(c))
    )
    if (selectedCategory) {
      filtered = filtered.filter((job) => job.categories.includes(selectedCategory))
    }
    setFilteredJobs(filtered)
  }



  async function handleSendMessage() {
    if (!newMessage.trim() && !selectedFile) return
    if (!selectedConversation) return
    setSendingMessage(true)
    try {
      if (selectedFile) {
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
    if (file.size > 10 * 1024 * 1024) {
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
      if (!profile.firstName || !profile.lastName || profile.categories.length === 0) {
        setMessage('Please fill in your first name, last name, and select at least one category')
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

  async function handleCertificationFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for your certification')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB')
      return
    }

    setCertFileInput(file)
  }

  async function handleAddCertification() {
    if (!newCertCategory || !certFileInput) {
      alert('Please select a category and choose an image')
      return
    }

    const duplicate = certifications.some(
      (c) => c.title === newCertCategory && (c.status === 'pending' || c.status === 'verified')
    )
    if (duplicate) {
      alert(`You already have a ${newCertCategory} certification pending or verified.`)
      return
    }

    setUploadingCert(true)
    try {
      const imageUrl = await certificationService.uploadCertificationImage(
        currentUser.uid,
        certFileInput
      )

      await certificationService.addCertification(currentUser.uid, {
        title: newCertCategory,
        imageUrl: imageUrl,
      })

      // Reload certifications
      const certs = await certificationService.getCertificationsByFreelancer(currentUser.uid)
      setCertifications(certs)
      setVerifiedCategories(certs.filter(c => c.status === 'verified').map(c => c.title))

      // Reset form
      setNewCertCategory('')
      setCertFileInput(null)
      if (certFileRef.current) certFileRef.current.value = ''
      alert('✓ Certification submitted for verification!')
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setUploadingCert(false)
  }

  async function handleMarkAsRead(notifId) {
    try {
      await notificationService.markAsRead(notifId)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationService.markAllAsRead(currentUser.uid)
    } catch (err) {
      console.error(err)
    }
  }

  function handleRemoveCertFileInput() {
    setCertFileInput(null)
    if (certFileRef.current) certFileRef.current.value = ''
  }

  async function handleDeductConnects(amount) {
    const newBalance = await connectService.deductConnects(currentUser.uid, 'freelancer', amount)
    setConnects(newBalance)
  }

  async function handleSubmitPurchase() {
    if (!selectedPackage || !receiptFile) return
    setSubmittingPurchase(true)
    try {
      await connectService.submitPurchase(currentUser.uid, 'freelancer', selectedPackage.connects, selectedPackage.price, receiptFile)
      setPurchaseSuccess(true)
      setSelectedPackage(null)
      setReceiptFile(null)
      if (receiptFileRef.current) receiptFileRef.current.value = ''
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setSubmittingPurchase(false)
  }

  async function handleKycUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB')
      return
    }
    setUploadingKyc(true)
    try {
      const imageUrl = await kycService.uploadIdImage(currentUser.uid, 'freelancer', file)
      await kycService.submitIdVerification(currentUser.uid, 'freelancer', imageUrl)
      setProfile(prev => ({ ...prev, idImageUrl: imageUrl, idVerificationStatus: 'pending' }))
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    setUploadingKyc(false)
    if (kycFileRef.current) kycFileRef.current.value = ''
  }

  const jobsFinished = conversations.filter((conv) => conv.status === 'closed').length
  const reviewCount = profile.totalReviews ?? reviews.length

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
        {/* Jobs Feed Tab */}
        {activeTab === 'jobs-feed' && (
          <div>
            {profile.idVerificationStatus !== 'verified' ? (
              <div style={{ backgroundColor: 'white', padding: 48, borderRadius: 8, boxShadow: 'var(--shadow-sm)', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
                {profile.idVerificationStatus === 'pending' ? (
                  <>
                    <p style={{ fontSize: 40, margin: '0 0 16px 0' }}>🕐</p>
                    <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--gray-900)' }}>ID Under Review</p>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', margin: 0 }}>Your government ID is being reviewed by our team. You'll be notified once it's approved.</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 40, margin: '0 0 16px 0' }}>🪪</p>
                    <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--gray-900)' }}>
                      {profile.idVerificationStatus === 'rejected' ? 'ID Verification Failed' : 'Verify Your Identity First'}
                    </p>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 24 }}>
                      {profile.idVerificationStatus === 'rejected'
                        ? 'Your ID was not accepted. Please upload a clearer photo of your government-issued ID.'
                        : 'Upload a valid government-issued ID (driver\'s license, passport, or national ID) to access job listings.'}
                    </p>
                    <input ref={kycFileRef} type="file" accept="image/*" onChange={handleKycUpload} style={{ display: 'none' }} />
                    <button
                      onClick={() => kycFileRef.current?.click()}
                      disabled={uploadingKyc}
                      style={{ padding: '12px 28px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                    >
                      {uploadingKyc ? 'Uploading...' : profile.idVerificationStatus === 'rejected' ? 'Re-upload ID' : 'Upload Government ID'}
                    </button>
                  </>
                )}
              </div>
            ) : verifiedCategories.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 60,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ fontSize: 40, margin: '0 0 12px 0' }}>📋</p>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No verified certifications yet</p>
                <p style={{ fontSize: 14, margin: 0 }}>Upload a certification in your profile and wait for admin verification to unlock jobs in that category.</p>
              </div>
            ) : (
              <>
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
                      <option value="">All My Categories</option>
                      {verifiedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                    <p style={{ fontSize: 14 }}>Check back soon for new opportunities in your verified categories</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: 20,
                  }}>
                    {filteredJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        currentUserId={currentUser.uid}
                        userCategories={verifiedCategories}
                        onApply={() => {}}
                        connectBalance={connects}
                        onDeductConnects={handleDeductConnects}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
                <button onClick={() => navigate('/freelancer', { state: { activeTab: 'jobs-feed' } })} style={{
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        overflow: 'hidden', backgroundColor: 'var(--gray-200)',
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 18,
                      }}>
                        {conv.customerPhoto
                          ? <img src={conv.customerPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '👤'}
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                        {conv.jobTitle}
                      </p>
                    </div>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 20,
                        backgroundColor:
                          conv.status === 'accepted' ? 'var(--success-light)' :
                          conv.status === 'declined' ? 'var(--danger-light)' :
                          conv.status === 'filled' ? 'var(--gray-100)' :
                          conv.status === 'closed' ? 'var(--gray-100)' :
                          'var(--gray-100)',
                        color:
                          conv.status === 'accepted' ? 'var(--success)' :
                          conv.status === 'declined' ? 'var(--danger)' :
                          conv.status === 'filled' ? 'var(--gray-500)' :
                          conv.status === 'closed' ? 'var(--gray-500)' :
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        overflow: 'hidden', backgroundColor: 'var(--gray-200)',
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20,
                      }}>
                        {selectedConversation.customerPhoto
                          ? <img src={selectedConversation.customerPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : '👤'}
                      </div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                        {selectedConversation.jobTitle}
                      </h4>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-500)' }}>
                      {selectedConversation.status === 'pending' && 'Application under review'}
                      {selectedConversation.status === 'accepted' && '✓ You have been assigned to this job!'}
                      {selectedConversation.status === 'declined' && 'Customer declined this application'}
                      {selectedConversation.status === 'filled' && 'This position was filled by another freelancer'}
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
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {msg.text && (
                            <div style={{
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
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--gray-200)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  backgroundColor: 'white',
                }}>
                  {selectedConversation.status === 'closed' || selectedConversation.status === 'declined' || selectedConversation.status === 'filled' ? (
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      color: 'var(--gray-400)',
                      fontSize: 13,
                      padding: '10px',
                    }}>
                      {selectedConversation.status === 'closed' ? 'This job is closed.' :
                       selectedConversation.status === 'filled' ? 'This position was filled by another freelancer.' :
                       'This application was declined.'}
                    </div>
                  ) : (
                    <>
                      {selectedFile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', backgroundColor: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--primary)' }}>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>📎 {selectedFile.name}</div>
                          <button onClick={handleFileRemove} style={{ padding: '4px 12px', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--gray-300)', fontSize: 14, outline: 'none' }}
                        />
                        <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept=".png,.jpg,.jpeg,.gif,.pdf" style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 16px', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 14 }} title="Attach image or PDF">📎</button>
                        <button onClick={handleSendMessage} disabled={sendingMessage} style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                          {sendingMessage ? '...' : 'Send'}
                        </button>
                      </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 20, backgroundColor: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average rating</p>
                    <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--gray-900)' }}>
                      {profile.averageRating ? profile.averageRating.toFixed(1) : '—'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
                      {profile.averageRating ? `${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'No rating yet'}
                    </p>
                  </div>

                  <div style={{ padding: 20, backgroundColor: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jobs completed</p>
                    <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--gray-900)' }}>
                      {jobsFinished}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
                      Closed conversations / finished jobs
                    </p>
                  </div>

                  <div style={{ padding: 20, backgroundColor: 'var(--gray-50)', borderRadius: 12, border: '1px solid var(--gray-200)' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total reviews</p>
                    <p style={{ margin: '10px 0 0', fontSize: 28, fontWeight: 700, color: 'var(--gray-900)' }}>
                      {reviewCount}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gray-500)' }}>
                      Feedback from customers
                    </p>
                  </div>
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
                      {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || '—'}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={profile.firstName}
                        onChange={handleProfileChange}
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={profile.lastName}
                        onChange={handleProfileChange}
                        placeholder="dela Cruz"
                      />
                    </div>
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

                  {/* Government ID Section */}
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                      Government ID
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-500)', marginLeft: 8 }}>
                        (Required for KYC verification)
                      </span>
                    </label>
                    {profile.idVerificationStatus === 'verified' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', backgroundColor: 'var(--success-light)', border: '1.5px solid var(--success)', borderRadius: 8 }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>Identity Verified</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-600)' }}>Your government ID has been approved</p>
                        </div>
                      </div>
                    ) : profile.idVerificationStatus === 'pending' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', backgroundColor: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 8 }}>
                        <span style={{ fontSize: 20 }}>🕐</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#92400e' }}>Under Review</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-600)' }}>Your ID is being reviewed by our team</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: 16, backgroundColor: 'var(--gray-50)', borderRadius: 8, border: '2px dashed var(--gray-300)' }}>
                        {profile.idVerificationStatus === 'rejected' && (
                          <p style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>
                            ❌ Your previous ID was rejected. Please upload a clearer image.
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 12 }}>
                          Upload a clear photo of your driver's license, passport, or any government-issued ID.
                        </p>
                        <input ref={kycFileRef} type="file" accept="image/*" onChange={handleKycUpload} style={{ display: 'none' }} />
                        <button
                          onClick={() => kycFileRef.current?.click()}
                          disabled={uploadingKyc}
                          style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        >
                          {uploadingKyc ? 'Uploading...' : '🪪 Upload Government ID'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Certifications Section */}
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                      Certifications & Badges
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-500)', marginLeft: 8 }}>
                        (Upload images for verification)
                      </span>
                    </label>

                    {certifications.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                        {certifications.map((cert) => (
                          <div key={cert.id} style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '2px solid ' + (cert.status === 'verified' ? 'var(--success)' : cert.status === 'rejected' ? 'var(--danger)' : 'var(--gray-300)'),
                            backgroundColor: cert.status === 'verified' ? 'var(--success-light)' : cert.status === 'rejected' ? 'var(--danger-light)' : 'var(--gray-50)',
                          }}>
                            <img
                              src={cert.imageUrl}
                              alt={cert.title}
                              style={{ width: '100%', height: 120, objectFit: 'cover' }}
                            />
                            <div style={{ padding: 10 }}>
                              <p style={{ fontSize: 12, margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cert.title}
                              </p>
                              <p style={{
                                fontSize: 11,
                                margin: '4px 0 0 0',
                                fontWeight: 600,
                                color: cert.status === 'verified' ? 'var(--success)' : cert.status === 'rejected' ? 'var(--danger)' : 'var(--gray-600)',
                              }}>
                                {cert.status === 'pending' && '⏳ Pending'}
                                {cert.status === 'verified' && '✓ Verified'}
                                {cert.status === 'rejected' && '❌ Rejected'}
                              </p>
                              {cert.rejectionReason && (
                                <p style={{ fontSize: 11, margin: '4px 0 0 0', color: 'var(--danger)', fontStyle: 'italic' }}>
                                  {cert.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add New Certification Form */}
                    <div style={{
                      padding: 16,
                      backgroundColor: 'var(--gray-50)',
                      borderRadius: 8,
                      border: '2px dashed var(--primary-light)',
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        Add New Certification
                      </p>

                      {certFileInput ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px',
                          backgroundColor: 'white',
                          borderRadius: 6,
                          border: '1px solid var(--primary)',
                          marginBottom: 12,
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {certFileInput.name}
                            </p>
                          </div>
                          <button
                            onClick={handleRemoveCertFileInput}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}

                      <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <select
                            value={newCertCategory}
                            onChange={(e) => setNewCertCategory(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 6,
                              border: '1px solid var(--gray-300)',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              backgroundColor: 'white',
                            }}
                          >
                            <option value="">Select a category...</option>
                            {freelancerService.CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <input
                            ref={certFileRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCertificationFileSelect}
                            style={{ display: 'none' }}
                          />
                          <button
                            onClick={() => certFileRef.current?.click()}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              backgroundColor: certFileInput ? 'var(--success-light)' : 'white',
                              color: certFileInput ? 'var(--success)' : 'var(--gray-600)',
                              border: '1px solid ' + (certFileInput ? 'var(--success)' : 'var(--gray-300)'),
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {certFileInput ? '✓ Image Selected' : '📷 Choose Image'}
                          </button>
                        </div>

                        <button
                          onClick={handleAddCertification}
                          disabled={uploadingCert || !newCertCategory || !certFileInput}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: newCertCategory && certFileInput ? 'var(--primary)' : 'var(--gray-300)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: newCertCategory && certFileInput ? 'pointer' : 'default',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {uploadingCert ? 'Uploading...' : 'Submit for Verification'}
                        </button>
                      </div>
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
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Notifications</h2>
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{
                backgroundColor: 'white',
                padding: 60,
                borderRadius: 8,
                textAlign: 'center',
                color: 'var(--gray-600)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <p style={{ fontSize: 40, margin: '0 0 12px 0' }}>🔔</p>
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No notifications yet</p>
                <p style={{ fontSize: 14, margin: 0 }}>We'll notify you about certifications, applications, and more</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    style={{
                      backgroundColor: notif.isRead ? 'white' : 'var(--primary-light)',
                      padding: '16px 20px',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-sm)',
                      border: `1px solid ${notif.isRead ? 'var(--gray-200)' : 'var(--primary)'}`,
                      cursor: notif.isRead ? 'default' : 'pointer',
                      display: 'flex',
                      gap: 14,
                      alignItems: 'flex-start',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>
                      {notif.type === 'certification_verified' && '✅'}
                      {notif.type === 'certification_rejected' && '❌'}
                      {notif.type === 'application_accepted' && '🎉'}
                      {notif.type === 'application_declined' && '📋'}
                      {notif.type === 'job_filled' && '🔒'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>
                          {notif.title}
                        </p>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        marginTop: 6,
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buy Connects Tab */}
        {activeTab === 'buy-connects' && (
          <div style={{ maxWidth: 760 }}>
            {/* Balance header */}
            <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 8, boxShadow: 'var(--shadow-sm)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Connect Balance</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>{connects ?? '—'} <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--gray-600)' }}>connects</span></p>
              </div>
              <div style={{ fontSize: 48 }}>💰</div>
            </div>

            {purchaseSuccess && (
              <div style={{ backgroundColor: 'var(--success-light)', border: '1.5px solid var(--success)', borderRadius: 8, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>Receipt submitted successfully!</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-600)' }}>Admin will verify your payment. Connects will be added once approved.</p>
                </div>
                <button onClick={() => setPurchaseSuccess(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 6px 0' }}>Choose a Package</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: 14, color: 'var(--gray-600)' }}>
                Applying to a job costs <strong>6 connects</strong>. Connects never expire.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                {connectService.PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => { setSelectedPackage(pkg); setPurchaseSuccess(false) }}
                    style={{
                      padding: 20,
                      borderRadius: 10,
                      border: `2px solid ${selectedPackage?.id === pkg.id ? 'var(--primary)' : 'var(--gray-200)'}`,
                      backgroundColor: selectedPackage?.id === pkg.id ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.15s',
                      boxShadow: selectedPackage?.id === pkg.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    }}
                  >
                    {pkg.popular && (
                      <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        MOST POPULAR
                      </span>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>{pkg.label}</p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 4px 0' }}>{pkg.connects}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 12px 0' }}>connects</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>₱{pkg.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedPackage && (
              <div style={{ backgroundColor: 'white', padding: 28, borderRadius: 8, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--primary-light)' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: 16 }}>Pay via GCash — ₱{selectedPackage.price}</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                  <div style={{ padding: 20, backgroundColor: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', margin: '0 0 8px 0', textTransform: 'uppercase' }}>GCash Number</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>
                      {/* TODO: Replace with your real GCash number */}
                      0917-XXX-XXXX
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--gray-500)', margin: 0 }}>Account Name: Trabahub</p>
                  </div>
                  <div style={{ padding: 12, backgroundColor: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/gcash-qr.png" alt="GCash QR Code" style={{ width: '100%', maxWidth: 160, display: 'block', borderRadius: 6 }} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 20 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 12px 0' }}>Upload your payment receipt</p>
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', margin: '0 0 16px 0' }}>
                    After sending ₱{selectedPackage.price} via GCash, take a screenshot of the confirmation and upload it here.
                  </p>
                  <input
                    ref={receiptFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  {receiptFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', backgroundColor: 'var(--success-light)', border: '1.5px solid var(--success)', borderRadius: 8, marginBottom: 16 }}>
                      <span style={{ fontSize: 18 }}>🖼️</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptFile.name}</span>
                      <button onClick={() => { setReceiptFile(null); if (receiptFileRef.current) receiptFileRef.current.value = '' }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 700, fontSize: 14 }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => receiptFileRef.current?.click()}
                      style={{ padding: '12px 24px', backgroundColor: 'white', color: 'var(--gray-700)', border: '1.5px dashed var(--gray-300)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 16 }}
                    >
                      📎 Choose Receipt Screenshot
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={handleSubmitPurchase}
                      disabled={!receiptFile || submittingPurchase}
                      style={{
                        flex: 1,
                        padding: '14px 24px',
                        backgroundColor: receiptFile ? 'var(--primary)' : 'var(--gray-300)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: receiptFile ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {submittingPurchase ? 'Submitting...' : `Submit Receipt — ${selectedPackage.connects} Connects for ₱${selectedPackage.price}`}
                    </button>
                    <button
                      onClick={() => { setSelectedPackage(null); setReceiptFile(null); if (receiptFileRef.current) receiptFileRef.current.value = '' }}
                      style={{ padding: '14px 20px', backgroundColor: 'var(--gray-100)', color: 'var(--gray-700)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                    >
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
