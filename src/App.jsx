
import { useEffect, useState } from 'react'
import './App.css'

import Register from './Register'
import Admin from './Admin'
import TagPage from './TagPage'
import OwnerAuth from './OwnerAuth'
import OwnerDashboard from './OwnerDashboard'
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
  const [menuOpen, setMenuOpen] = useState(false)

  // SUPABASE AUTHENTICATION
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
      setMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // LOAD QR TAG DETAILS
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
          .select('*')
          .eq('id', tagId)
          .maybeSingle()

        if (error) throw error

        if (active) {
          setTagData(data || null)
        }
      } catch (error) {
        console.error('Could not load tag:', error)

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

  // GO TO HOMEPAGE
  function goHome() {
    window.history.pushState({}, '', window.location.pathname)

    setTagId('')
    setTagData(null)
    setShowDashboard(false)
    setShowOwnerLogin(false)
    setMenuOpen(false)
  }

  // OPEN OWNER LOGIN
  function openOwnerLogin() {
    setShowOwnerLogin(true)
    setShowDashboard(false)
    setMenuOpen(false)
  }

  // AFTER OWNER LOGIN
  function handleOwnerLogin() {
    setShowOwnerLogin(false)
    setShowDashboard(true)
  }

  // LOGOUT
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('Logout failed: ' + error.message)
      return
    }

    setUser(null)
    setShowDashboard(false)
    setShowOwnerLogin(false)
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

  // QR TAG ROUTING
  if (tagId) {
    if (tagLoading) {
      return (
        <div className="app-loading">
          <h2>SmartTag</h2>
          <p>Loading tag details...</p>
        </div>
      )
    }

    if (tagData) {
      return <TagPage tag={tagData} />
    }

    if (user) {
      return <Register tagId={tagId} />
    }

    return (
      <OwnerAuth
        onLogin={() => {
          setShowOwnerLogin(false)
        }}
      />
    )
  }

  // OWNER LOGIN PAGE
  if (showOwnerLogin && !user) {
    return (
      <div className="smarttag-app">
        <div style={{
          padding: '25px',
          textAlign: 'center'
        }}>
          <button
            className="secondary-button"
            onClick={goHome}
          >
            ← Back to Home
          </button>
        </div>

        <OwnerAuth onLogin={handleOwnerLogin} />
      </div>
    )
  }

  // OWNER DASHBOARD
  if (showDashboard && user) {
    return (
      <div>
        <div style={{
          padding: '15px 25px',
          background: '#080b16',
          borderBottom: '1px solid #29324b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            className="secondary-button"
            onClick={goHome}
          >
            ← Home
          </button>

          <button
            className="primary-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        <OwnerDashboard user={user} />
      </div>
    )
  }

  // MAIN HOMEPAGE
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

            <a href="#admin" onClick={() => setMenuOpen(false)}>
              Admin
            </a>

            {user ? (
              <button
                className="nav-button"
                onClick={() => {
                  setShowDashboard(true)
                  setMenuOpen(false)
                }}
              >
                My Dashboard
              </button>
            ) : (
              <button
                className="nav-button"
                onClick={openOwnerLogin}
              >
                Owner Login
              </button>
            )}

          </nav>
        </div>
      </header>

      <main>

        <section className="hero" id="home">

          <div className="hero-content">

            <div className="hero-badge">
              Smart Identification. Safer Belongings.
            </div>

            <h1>
              Lost Something?
              <br />
              <span>Get It Back.</span>
            </h1>

            <p>
              SmartTag helps people reconnect lost belongings
              with their owners through simple, unique QR codes.
            </p>

            <div className="hero-actions">
              <a href="#how-it-works" className="primary-button">
                Explore How It Works →
              </a>

              <a href="#features" className="secondary-button">
                Discover Features
              </a>
            </div>

            <div className="hero-note">
              <span>✓</span> Unique QR Identity
              <span>✓</span> Quick Scanning
              <span>✓</span> Easy Recovery
            </div>

          </div>

          <div className="hero-visual">

            <div className="tag-card">

              <div className="tag-top">
                <span className="tag-logo">S</span>
                <span>SMARTTAG</span>
              </div>

              <div className="qr-placeholder">
                <div className="qr-pattern">
                  <span>▦</span>
                </div>
              </div>

              <h3>Scan to identify</h3>
              <p>Help this item find its owner.</p>

              <div className="tag-bottom">
                SMARTER LOST & FOUND
              </div>

            </div>

            <div className="floating-label">
              <span>✓</span> Smart QR Technology
            </div>

          </div>
        </section>

        <section className="stats-section">

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
                A finder can scan the tag and view available details.
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
            Choose SmartTag for a simpler lost-and-found experience.
          </p>

          <button
            className="primary-button"
            onClick={openOwnerLogin}
          >
            Owner Login →
          </button>
        </section>

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
