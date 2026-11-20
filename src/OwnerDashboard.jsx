
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './OwnerDashboard.css'

function OwnerDashboard({ user }) {
  const [items, setItems] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      const { data: itemData, error: itemError } = await supabase
        .from('smarttags')
        .select('id, owner, item, category, description, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (itemError) {
        setError(itemError.message)
        setLoading(false)
        return
      }

      setItems(itemData || [])

      const ids = (itemData || []).map(item => item.id)

      if (ids.length > 0) {
        const { data: requestData, error: requestError } = await supabase
          .from('contact_requests')
          .select('id, tag_id, finder_name, finder_contact, message, created_at')
          .in('tag_id', ids)
          .order('created_at', { ascending: false })

        if (requestError) {
          setError(requestError.message)
        } else {
          setRequests(requestData || [])
        }
      } else {
        setRequests([])
      }

      setLoading(false)
    }

    loadDashboard()
  }, [user.id])

  async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/'
    }
  }

  function goHome() {
    window.location.href = '/'
  }

  if (loading) {
    return <main className="dashboard-loading">Loading your dashboard...</main>
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <h2 className="dashboard-logo">Smart<span>Tag</span></h2>

        <p className="sidebar-label">MENU</p>
        <a href="#overview" className="sidebar-link active">▦ Overview</a>
        <a href="#my-items" className="sidebar-link">◈ My Items</a>
        <a href="#requests" className="sidebar-link">✉ Finder Requests</a>

        <div className="sidebar-bottom">
          <p className="sidebar-label">ACCOUNT</p>
          <p className="dashboard-email">{user.email}</p>
          <button className="dashboard-logout" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">OWNER PANEL</p>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">
              Manage your SmartTags and finder activity.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button className="dashboard-back" onClick={goHome}>
              ← Back to Home
            </button>
            <div className="profile-circle">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="dashboard-stats" id="overview">
          <article className="stat-card">
            <span className="stat-icon">◈</span>
            <p>Total Registered Items</p>
            <h2>{items.length}</h2>
            <small>Your registered SmartTags</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">✉</span>
            <p>Total Finder Requests</p>
            <h2>{requests.length}</h2>
            <small>People who contacted you</small>
          </article>

          <article className="stat-card">
            <span className="stat-icon">✓</span>
            <p>Account Status</p>
            <h2 className="status-active">Active</h2>
            <small>Owner account</small>
          </article>
        </section>

        <section className="dashboard-section" id="my-items">
          <div className="section-heading">
            <div>
              <h2>My Registered Items</h2>
              <p>All belongings connected to your account.</p>
            </div>
            <span className="count-badge">{items.length} Items</span>
          </div>

          {items.length === 0 ? (
            <div className="dashboard-empty">
              <span>◈</span>
              <h3>No items registered yet</h3>
              <p>Scan your SmartTag QR code to register your first item.</p>
            </div>
          ) : (
            <div className="dashboard-item-grid">
              {items.map(item => (
                <article className="dashboard-item-card" key={item.id}>
                  <div className="item-card-top">
                    <span className="item-category">{item.category}</span>
                    <span className="item-status">Registered</span>
                  </div>
                  <h3>{item.item}</h3>
                  <p className="item-owner">Owner: {item.owner}</p>
                  <p className="item-description">
                    {item.description || 'No description added.'}
                  </p>
                  <div className="item-card-footer">
                    <span>TAG ID</span>
                    <strong>{item.id}</strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section" id="requests">
          <div className="section-heading">
            <div>
              <h2>Finder Requests</h2>
              <p>Contact messages received from people who scanned your tags.</p>
            </div>
            <span className="count-badge">{requests.length} Requests</span>
          </div>

          {requests.length === 0 ? (
            <div className="dashboard-empty">
              <span>✉</span>
              <h3>No finder requests yet</h3>
              <p>New contact requests will appear here.</p>
            </div>
          ) : (
            <div className="request-list">
              {requests.map(request => (
                <article className="request-card" key={request.id}>
                  <div className="request-heading">
                    <div className="request-avatar">
                      {request.finder_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3>{request.finder_name}</h3>
                      <small>{new Date(request.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                  <p><strong>Contact:</strong> {request.finder_contact}</p>
                  <p><strong>Tag ID:</strong> {request.tag_id}</p>
                  <p><strong>Message:</strong> {request.message || 'No message provided.'}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          © 2026 SmartTag · Owner Dashboard
        </footer>
      </main>
    </div>
  )
}

export default OwnerDashboard
