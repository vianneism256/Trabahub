import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthProvider'
import { useLocation } from 'react-router-dom'
import { freelancerService } from '../services/freelancerService'
import { jobService } from '../services/jobService'
import JobCard from '../components/JobCard'

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

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
  }, [location.state?.activeTab])

  useEffect(() => {
    if (currentUser) {
      loadProfile()
      loadJobs()
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

  async function loadJobs() {
    try {
      const allJobs = await jobService.getAllOpenJobs()
      setJobs(allJobs)
      // Track my applications
      const myApps = allJobs.reduce((acc, job) => {
        const userApps = job.applications?.filter((a) => a.freelancerId === currentUser.uid) || []
        return [...acc, ...userApps.map((a) => job.id)]
      }, [])
      setMyApplications(myApps)
    } catch (err) {
      console.error(err)
    }
  }

  function filterJobs() {
    let filtered = jobs
    if (selectedCategory) {
      filtered = filtered.filter((job) => job.categories.includes(selectedCategory))
    }
    setFilteredJobs(filtered)
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
                    onApply={loadJobs}
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
                  .map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      currentUserId={currentUser.uid}
                      userCategories={profile.categories}
                      onApply={loadJobs}
                    />
                  ))}
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
                    ✏️ Edit Profile
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 24 }}>
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
                      {loading ? '⏳ Saving...' : '💾 Save Profile'}
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
