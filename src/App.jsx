import { Link, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './components/Navigation'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import SelectRole from './pages/SelectRole'
import DashboardCustomer from './pages/DashboardCustomer'
import DashboardFreelancer from './pages/DashboardFreelancer'
import DashboardAdmin from './pages/DashboardAdmin'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--gray-50)' }}>
      <Navigation />
      
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={
            <div style={{
              backgroundImage: 'linear-gradient(135deg, var(--primary) 0%, #003d99 100%)',
              color: 'white',
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
            }}>
              <div style={{ textAlign: 'center', maxWidth: 600 }}>
                <h1 style={{ color: 'white', marginBottom: 16, fontSize: 44 }}>
                  Connect with Skilled Professionals
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginBottom: 40, lineHeight: 1.6 }}>
                  Find trusted blue-collar freelancers for plumbing, electrical work, carpentry, and more. Or showcase your skills and get hired.
                </p>
                
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/signup" style={{
                    padding: '14px 32px',
                    backgroundColor: 'white',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 16,
                    transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'inline-block',
                  }} onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.target.style.transform = 'none'}>
                    Get Started
                  </Link>
                  <Link to="/login" style={{
                    padding: '14px 32px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 16,
                    border: '2px solid white',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                  }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}>
                    Login
                  </Link>
                </div>

                <div style={{
                  marginTop: 80,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 30,
                  maxWidth: 900,
                }}>
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
                    <h3 style={{ color: 'white' }}>Find Services</h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Browse skilled professionals</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
                    <h3 style={{ color: 'white' }}>Offer Skills</h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Get hired for your expertise</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                    <h3 style={{ color: 'white' }}>Verified Quality</h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Trusted professionals only</p>
                  </div>
                </div>
              </div>
            </div>
          } />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/select-role" element={<SelectRole />} />
          <Route path="/customer" element={<DashboardCustomer />} />
          <Route path="/freelancer" element={<DashboardFreelancer />} />
          <Route path="/admin" element={<DashboardAdmin />} />
        </Routes>
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '24px 20px',
        backgroundColor: 'white',
        borderTop: '1px solid var(--gray-300)',
        color: 'var(--gray-600)',
        fontSize: 13,
      }}>
        <p>&copy; 2026 Trabahub. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
