import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../supabase.js'
import { conversationService } from '../services/conversationService'
import { notificationService } from '../services/notificationService'
import { connectService } from '../services/connectService'

export default function Navigation() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userRole, setUserRole] = useState(null)
  const [messageBadge, setMessageBadge] = useState(0)
  const [notifBadge, setNotifBadge] = useState(0)
  const [customerNotifBadge, setCustomerNotifBadge] = useState(0)
  const [connects, setConnects] = useState(null)

  useEffect(() => {
    if (location.state?.role) {
      setUserRole(location.state.role)
    }
  }, [location.state?.role])

  useEffect(() => {
    if (currentUser) {
      loadUserRole()
    } else {
      setUserRole(null)
    }
  }, [currentUser])


  useEffect(() => {
    if (!currentUser || !userRole) return

    let unsubscribe

    if (userRole === 'freelancer') {
      unsubscribe = conversationService.listenToFreelancerConversations(
        currentUser.uid,
        (convs) => {
          const count = convs.filter((c) => {
            if (!c.lastMessageAt) return false
            if (!c.freelancerLastReadAt) return true
            return c.lastMessageAt > c.freelancerLastReadAt
          }).length
          setMessageBadge(count)
        }
      )
    } else if (userRole === 'customer') {
      unsubscribe = conversationService.listenToCustomerConversations(
        currentUser.uid,
        (convs) => {
          const count = convs.filter((c) => {
            if (!c.lastMessageAt) return false
            if (!c.customerLastReadAt) return true
            return c.lastMessageAt > c.customerLastReadAt
          }).length
          setMessageBadge(count)
        }
      )
    }

    return () => unsubscribe?.()
  }, [currentUser, userRole])

  useEffect(() => {
    if (!currentUser || userRole !== 'freelancer') return
    const unsubscribe = notificationService.listenToNotifications(
      currentUser.uid,
      (notifs) => setNotifBadge(notifs.filter((n) => !n.isRead).length)
    )
    return () => unsubscribe()
  }, [currentUser, userRole])

  useEffect(() => {
    if (!currentUser || userRole !== 'customer') return
    const unsubscribe = notificationService.listenToNotifications(
      currentUser.uid,
      (notifs) => setCustomerNotifBadge(notifs.filter((n) => !n.isRead).length)
    )
    return () => unsubscribe()
  }, [currentUser, userRole])

  useEffect(() => {
    if (!currentUser || !userRole || userRole === 'admin') return
    connectService.getBalance(currentUser.uid, userRole).then(setConnects).catch(console.error)

    const table = userRole === 'freelancer' ? 'freelancers' : 'customers'
    const channel = supabase
      .channel(`connects-nav-${currentUser.uid}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `firebase_uid=eq.${currentUser.uid}` },
        (payload) => { if (payload.new?.connects !== undefined) setConnects(payload.new.connects) }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentUser, userRole])

  async function loadUserRole() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('firebase_uid', currentUser.uid)
        .maybeSingle()
      if (error) throw error
      setUserRole(data?.role || null)
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
          Trabahub
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
                <span style={{ fontSize: 20 }}></span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>
                    {currentUser.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>
                    {currentUser.email}
                  </div>
                </div>
              </div>
              {connects !== null && (
                <div
                  onClick={() => {
                    const route = userRole === 'freelancer' ? '/freelancer' : '/customer'
                    navigate(route, { state: { activeTab: 'buy-connects' } })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    backgroundColor: connects < 6 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${connects < 6 ? '#fca5a5' : '#86efac'}`,
                    borderRadius: 20,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 14 }}>💰</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: connects < 6 ? '#dc2626' : '#15803d' }}>{connects}</span>
                  <span style={{ fontSize: 11, color: connects < 6 ? '#ef4444' : '#166534', fontWeight: 600 }}>connects</span>
                </div>
              )}
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
            Find Freelancers
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
            Post a Job
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
            My Jobs
          </button>
          <BadgeTab label="Messages" tabName="messages" route="/customer" badge={messageBadge} />
          <BadgeTab label="Notifications" tabName="notifications" route="/customer" badge={customerNotifBadge} />
          <button
            onClick={() => navigate('/customer', { state: { activeTab: 'buy-connects' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'buy-connects' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'buy-connects' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            Buy Connects
          </button>
          <button
            onClick={() => navigate('/customer', { state: { activeTab: 'my-profile' } })}
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
            My Profile
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
            Browse Jobs
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
            My Applications
          </button>
          <BadgeTab label="Messages" tabName="messages" route="/freelancer" badge={messageBadge} />
          <BadgeTab label="Notifications" tabName="notifications" route="/freelancer" badge={notifBadge} />
          <button
            onClick={() => navigate('/freelancer', { state: { activeTab: 'buy-connects' } })}
            style={{
              padding: '12px 20px',
              backgroundColor: location.state?.activeTab === 'buy-connects' ? 'var(--primary)' : 'transparent',
              color: location.state?.activeTab === 'buy-connects' ? 'white' : 'var(--gray-700)',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            Buy Connects
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
            My Profile
          </button>
        </div>
      )}
    </div>
  )

  function BadgeTab({ label, tabName, route, badge = 0 }) {
    const isActive = location.state?.activeTab === tabName
    return (
      <button
        onClick={() => navigate(route, { state: { activeTab: tabName } })}
        style={{
          padding: '12px 20px',
          backgroundColor: isActive ? 'var(--primary)' : 'transparent',
          color: isActive ? 'white' : 'var(--gray-700)',
          border: 'none',
          borderRadius: '6px 6px 0 0',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
          transition: 'all 0.2s',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {label}
        {badge > 0 && (
          <span style={{
            backgroundColor: 'var(--danger)',
            color: 'white',
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {badge}
          </span>
        )}
      </button>
    )
  }
}
