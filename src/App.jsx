
import { useEffect, useState } from 'react'
import './App.css'

import Register from './Register'
import Admin from './Admin'
import TagPage from './TagPage'
import OwnerAuth from './OwnerAuth'
import OwnerDashboard from './OwnerDashboard'
import Donation from './Donation'
import { supabase } from './supabase'

function App() {
  const [user, setUser] = useState(null)

  const [tagId, setTagId] = useState(
    new URLSearchParams(window.location.search).get('tag') || ''
  )

  const [tagData, setTagData] = useState(null)
  const [tagLoading, setTagLoading] = useState(false)
  const [appLoading, setAppLoading] = useState(true)

  const [showDashboard, setShowDashboard] = useState(false)
  const [showOwnerLogin, setShowOwnerLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerIntent, setRegisterIntent] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  // AUTHENTICATION
  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session error:', error)
      }

      if (mounted) {
        setUser(data?.session?.user || null)
        setAppLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user || null)

        if (!session?.user) {
          setShowDashboard(false)
          setShowOwnerLogin(false)
          setShowRegister(false)
          setRegisterIntent(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // BROWSER BACK BUTTON
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search)

      setTagId(params.get('tag') || '')
      setShowDashboard(false)
      setShowOwnerLogin(false)
      setShowRegister(false)
      setRegisterIntent(false)
      setMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // LOAD REGISTERED QR DETAILS
  useEffect(() => {
    let active = true

    async function loadTag() {
      if (!tagId) {
        setTagData(null)
        setTagLoading(false)
        return
      }

      setTagLoading(true)
      setTagData(null)

      try {
        const { data, error } = await supabase
          .from('smarttags')
          .select('id, owner, item, category, description')
          .eq('id', tagId)
          .maybeSingle()

        if (error) throw error

        if (active) {
          setTagData(data || null)
        }
      } catch (error) {
        console.error('Could not load SmartTag:', error)

        if (active) {
          setTagData(null)
        }
      } finally {
        if (active) {
          setTagLoading(false)
        }
      }
    }

    loadTag()

    return () => {
      active = false
    }
  }, [tagId])

  // RETURN TO HOMEPAGE
  function goHome() {
    window.history.pushState({}, '', window.location.pathname)

    setTagId('')
    setTagData(null)
    setShowDashboard(false)
    setShowOwnerLogin(false)
    setShowRegister(false)
    setRegisterIntent(false)
    setMenuOpen(false)
  }

  // START REGISTRATION
  function startRegistration() {
    setMenuOpen(false)

    if (!tagId) {
      alert('Please scan your SmartTag QR code first.')
      return
    }

    if (tagData) {
      alert('This SmartTag is already registered.')
      return
    }

    setRegisterIntent(true)

    if (user) {
      setShowRegister(true)
      setShowOwnerLogin(false)
      setShowDashboard(false)
    } else {
      setAuthMode('login')
      setShowOwnerLogin(true)
      setShowDashboard(false)
      setShowRegister(false)
    }
  }

  // OPEN OWNER LOGIN
  function openOwnerLogin() {
    setAuthMode('login')
    setRegisterIntent(false)
    setShowOwnerLogin(true)
    setShowDashboard(false)
    setShowRegister(false)
    setMenuOpen(false)
  }

  // OPEN OWNER SIGNUP
  function openOwnerSignup() {
    setAuthMode('signup')
    setRegisterIntent(false)
    setShowOwnerLogin(true)
    setShowDashboard(false)
    setShowRegister(false)
    setMenuOpen(false)
  }

  // OPEN DASHBOARD
  function openDashboard() {
    if (!user) {
      openOwnerLogin()
      return
    }

    setShowDashboard(true)
    setShowOwnerLogin(false)
    setShowRegister(false)
    setRegisterIntent(false)
    setMenuOpen(false)
  }

  // AFTER LOGIN
  function handleOwnerLogin() {
    setShowOwnerLogin(false)

    if (registerIntent && tagId && !tagData) {
      setShowRegister(true)
      setShowDashboard(false)
    } else {
      setShowDashboard(true)
      setShowRegister(false)
    }
  }

  // LOGOUT
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Logout failed: ' + error.message)
      return
    }

    goHome()
  }

  if (appLoading) {
    return (
      <div className="app-loading">
        <h2>SmartTag</h2>
        <p>Loading your experience...</p>
      </div>
    )
  }

  // CHECK QR
  if (tagId && tagLoading) {
    return (
      <div className="app-loading">
        <h2>SmartTag</h2>
        <p>Checking your SmartTag...</p>
      </div>
    )
  }

  // REGISTERED QR: FINDER PAGE
  if (tagId && tagData) {
    return (
      <TagPage
        tag={tagData}
        onSuccess={goHome}
      />
    )
  }

  // REGISTRATION PAGE
  if (showRegister && user && tagId && !tagData) {
    return (
      <Register
        tagId={tagId}
        onSuccess={goHome}
      />
    )
  }

  // OWNER LOGIN / SIGNUP
  if (showOwnerLogin && !user) {
    return (
      <div className="smarttag-app">
        <OwnerAuth
          initialMode={authMode}
          onLogin={handleOwnerLogin}
          onBack={() => {
            setShowOwnerLogin(false)
            setRegisterIntent(false)
          }}
        />
      </div>
    )
  }

  // OWNER DASHBOARD
  if (showDashboard && user) {
    return <OwnerDashboard user={user} />
  }

  // HOMEPAGE
  return (
    <div className="smarttag-app">

      <header className="site-header">
        <div className="nav-container">

          <button className="brand" onClick={goHome}>
            <span className="brand-icon">S</span>
            <span>SmartTag</span>
          </button>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>

            <a href="#home" onClick={() => setMenuOpen(false)}>
              Home
            </a>

            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How It Works
            </a>

            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>

            <a href="#donate" onClick={() => setMenuOpen(false)}>
              Donate
            </a>

            <a href="#admin" onClick={() => setMenuOpen(false)}>
              Admin
            </a>

            {user ? (
              <button
                className="nav-button"
                onClick={openDashboard}
              >
                My Dashboard
              </button>
            ) : (
              <>
                <button
                  className="nav-button"
                  onClick={openOwnerLogin}
                >
                  Owner Login
                </button>

                <button
                  className="nav-button"
                  onClick={openOwnerSignup}
                >
                  Sign Up
                </button>
              </>
            )}

          </nav>
        </div>
      </header>

      <main>

        {/* PREMIUM HERO SECTION */}
        <section className="hero premium-hero" id="home">

          <div className="hero-content premium-hero-content">

            <div className="hero-badge">
              <span className="hero-badge-dot"></span>
              SMART IDENTIFICATION. SAFER BELONGINGS.
            </div>

            <h1>
              Lost Something?
              <br />
              <span>Bring It Back.</span>
            </h1>

            <p className="premium-hero-description">
              A smarter way to protect the things that matter.
              SmartTag connects lost belongings with their owners
              through unique QR codes and simple contact requests.
            </p>

            <div className="hero-actions premium-hero-actions">

              <button
                className="primary-button"
                onClick={startRegistration}
              >
                Register Your SmartTag
                <span className="hero-button-arrow">→</span>
              </button>

              <button
                className="secondary-button"
                onClick={openOwnerLogin}
              >
                Owner Login
              </button>

              <button
                className="secondary-button"
                onClick={openOwnerSignup}
              >
                Sign Up
              </button>

            </div>

            <div className="hero-trust-row">

              <div className="hero-trust-item">
                <span className="trust-check">✓</span>
                <span>Unique QR Identity</span>
              </div>

              <div className="hero-trust-item">
                <span className="trust-check">✓</span>
                <span>Easy Registration</span>
              </div>

              <div className="hero-trust-item">
                <span className="trust-check">✓</span>
                <span>Simple Recovery</span>
              </div>

            </div>

          </div>

          <div className="hero-visual premium-hero-visual">

            <div className="hero-glow"></div>

            <div className="tag-card premium-tag-card">

              <div className="tag-top">
                <div className="tag-brand-group">
                  <span className="tag-logo">S</span>
                  <span>SMARTTAG</span>
                </div>

                <span className="tag-status">
                  <span></span>
                  ACTIVE
                </span>
              </div>

              <div className="tag-card-divider"></div>

              <div className="tag-card-main">

                <div className="tag-card-label">
                  YOUR BELONGINGS, CONNECTED
                </div>

                <div className="qr-placeholder premium-qr-placeholder">
                  <div className="qr-pattern">
                    <span>▦</span>
                  </div>
                </div>

                <h3>Scan to identify</h3>

                <p>
                  One scan can help a finder reconnect
                  this item with its owner.
                </p>

              </div>

              <div className="tag-bottom">
                <span>SMARTER LOST & FOUND</span>
                <span className="tag-card-mark">ST.</span>
              </div>

            </div>

            <div className="floating-label premium-floating-label">
              <span className="floating-label-icon">✓</span>
              <span>
                <strong>Smart QR Technology</strong>
                <small>Simple. Connected. Convenient.</small>
              </span>
            </div>

            <div className="hero-side-note">
              <span className="hero-side-line"></span>
              <span>IDENTIFY · CONNECT · RECOVER</span>
            </div>

          </div>

        </section>

        {/* QUICK BENEFITS */}
        <section className="stats-section premium-stats-section">

          <div className="stat-item">
            <h2>01</h2>
            <p>Unique QR Codes</p>
          </div>

          <div className="stat-item">
            <h2>02</h2>
            <p>Easy Registration</p>
          </div>

          <div className="stat-item">
            <h2>03</h2>
            <p>Simple Recovery</p>
          </div>

        </section>

        <section className="content-section" id="how-it-works">

          <div className="section-heading">
            <span>HOW IT WORKS</span>
            <h2>Three Simple Steps</h2>
            <p>Get your lost item back with ease.</p>
          </div>

          <div className="steps-grid">

            <article className="info-card">
              <div className="step-number">01</div>
              <h3>Get Your SmartTag</h3>
              <p>
                Attach your unique SmartTag QR code to your belongings.
              </p>
            </article>

            <article className="info-card">
              <div className="step-number">02</div>
              <h3>Register Your Item</h3>
              <p>
                Scan the QR code and register your item with its details.
              </p>
            </article>

            <article className="info-card">
              <div className="step-number">03</div>
              <h3>Reconnect</h3>
              <p>
                A finder can scan the tag and send a contact request.
              </p>
            </article>

          </div>
        </section>

        <section className="features-section" id="features">

          <div className="section-heading">
            <span>WHY SMARTTAG</span>
            <h2>Designed for Peace of Mind</h2>
            <p>One small tag can make identifying belongings easier.</p>
          </div>

          <div className="features-grid">

            <article className="feature-card">
              <div className="feature-icon">⌗</div>
              <h3>Unique QR Identity</h3>
              <p>
                Every SmartTag has its own unique identification code.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">↗</div>
              <h3>Quick Scanning</h3>
              <p>
                Scan the QR code using a smartphone camera.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">♡</div>
              <h3>Easy Recovery</h3>
              <p>
                Help finders connect with the registered owner.
              </p>
            </article>

          </div>
        </section>

        <section className="cta-section">
          <h2>Make Your Belongings Smarter.</h2>
          <p>
            Have a SmartTag? Register it to help protect your belongings.
          </p>

          <button
            className="primary-button"
            onClick={startRegistration}
          >
            Register Your SmartTag →
          </button>
        </section>

        {/* DONATION SECTION */}
        <Donation />

        {/* ADMIN SECTION */}
        <section className="admin-section" id="admin">
          <Admin />
        </section>

      </main>

      <footer className="site-footer">

        <div className="footer-brand">
          <span className="brand-icon">S</span>
          <strong>SmartTag</strong>
        </div>

        <p>Smart Identification. Safer Belongings.</p>

        <p className="copyright">
          © {new Date().getFullYear()} SmartTag. All rights reserved.
        </p>

      </footer>

    </div>
  )
}

export default App
