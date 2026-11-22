
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './OwnerDashboard.css'

function OwnerDashboard({ user }) {
  const [items, setItems] = useState([])
  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sectionWarnings, setSectionWarnings] = useState([])
  const [loggingOut, setLoggingOut] = useState(false)
  const [updatingNotification, setUpdatingNotification] = useState(null)
  const [openFaq, setOpenFaq] = useState(0)
  const [activeSection, setActiveSection] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTag, setSelectedTag] = useState(null)
  const [copiedTagId, setCopiedTagId] = useState(false)
  const [copiedTagDetails, setCopiedTagDetails] = useState(false)

  const faqs = [
    {
      question: 'How does SmartTag work?',
      answer: 'SmartTag connects your registered belongings with a unique QR code. When someone scans your QR code, they can view the finder page and send you a contact request without creating an account.'
    },
    {
      question: 'How can I register a new item?',
      answer: 'Visit the SmartTag homepage, choose the registration option, log in to your owner account and complete the item registration form.'
    },
    {
      question: 'How will I know if someone finds my item?',
      answer: 'When someone submits a finder request through your SmartTag, you will receive a notification in your Notification Center.'
    },
    {
      question: 'Where can I see finder contact details?',
      answer: 'Open Finder Requests to view the finder name, contact information and message.'
    },
    {
      question: 'What should I do if my QR code is not working?',
      answer: 'Check that the QR code is clear and undamaged. Make sure your SmartTag is registered. If the problem continues, contact the SmartTag administrator.'
    },
    {
      question: 'Can I use one account for multiple items?',
      answer: 'Yes. You can register multiple belongings using the same owner account and manage them from your dashboard.'
    },
    {
      question: 'Why am I not receiving notifications?',
      answer: 'Refresh your dashboard and check your Notification Center. If notifications are still missing, the administrator may need to check the notification service.'
    }
  ]

  useEffect(() => {
    let active = true
    let channel = null

    async function loadDashboard() {
      if (!user?.id) {
        setError('Please login to view your dashboard.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setSectionWarnings([])

      const warnings = []

      try {
        const { data: tagData, error: tagError } = await supabase
          .from('smarttags')
          .select('id, owner, item, category, description, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })

        if (tagError) throw new Error(`SmartTags: ${tagError.message}`)

        const registeredItems = tagData || []

        if (!active) return

        setItems(registeredItems)

        if (registeredItems.length > 0) {
          const tagIds = registeredItems.map(tag => tag.id)

          const { data: requestData, error: requestError } = await supabase
            .from('contact_requests')
            .select('id, tag_id, finder_name, finder_contact, message, created_at')
            .in('tag_id', tagIds)
            .order('created_at', { ascending: false })

          if (requestError) {
            warnings.push(`Finder Requests: ${requestError.message}`)
            setRequests([])
          } else {
            setRequests(requestData || [])
          }
        } else {
          setRequests([])
        }

        const { data: notificationData, error: notificationError } =
          await supabase
            .from('notifications')
            .select('id, owner_id, tag_id, title, message, type, is_read, created_at')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100)

        if (notificationError) {
          warnings.push(`Notifications: ${notificationError.message}`)
          setNotifications([])
        } else {
          setNotifications(notificationData || [])
        }

        if (active) setSectionWarnings(warnings)
      } catch (err) {
        console.error('Dashboard loading error:', err)

        if (active) {
          setError(err.message || 'Dashboard data could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (user?.id) {
      channel = supabase
        .channel(`owner-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `owner_id=eq.${user.id}`
          },
          payload => {
            if (!active) return

            setNotifications(prev => {
              if (prev.some(item => item.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `owner_id=eq.${user.id}`
          },
          payload => {
            if (!active) return

            setNotifications(prev =>
              prev.map(item =>
                item.id === payload.new.id ? payload.new : item
              )
            )
          }
        )
        .subscribe()
    }

    loadDashboard()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [user?.id, refreshing])

  const unreadCount = notifications.filter(
    notification => !notification.is_read
  ).length

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        items
          .map(item => item.category?.trim())
          .filter(Boolean)
      )
    ]

    return ['All', ...uniqueCategories.sort((a, b) => a.localeCompare(b))]
  }, [items])

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return items.filter(item => {
      const matchesSearch =
        !search ||
        [
          item.item,
          item.category,
          item.description,
          String(item.id)
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(search))

      const matchesCategory =
        selectedCategory === 'All' ||
        (item.category || '').trim() === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [items, searchTerm, selectedCategory])

  const recentActivity = useMemo(() => {
    const activity = [
      ...requests.map(request => ({
        id: `request-${request.id}`,
        title: 'New finder request',
        detail: `${request.finder_name || 'Someone'} contacted you about ${getTagName(request.tag_id)}`,
        date: request.created_at,
        icon: '✉'
      })),
      ...items.map(item => ({
        id: `item-${item.id}`,
        title: 'SmartTag registered',
        detail: `${item.item || 'New item'} was added to your account`,
        date: item.created_at,
        icon: '⌗'
      }))
    ]

    return activity
      .filter(entry => entry.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [items, requests])

  function getTagName(tagId) {
    const foundTag = items.find(
      item => String(item.id) === String(tagId)
    )

    return foundTag?.item || 'Unknown item'
  }

  function formatDate(date) {
    if (!date) return 'Date unavailable'

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return 'Date unavailable'

    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  async function copyTagId(tagId) {
    try {
      await navigator.clipboard.writeText(String(tagId))
      setCopiedTagId(true)

      window.setTimeout(() => {
        setCopiedTagId(false)
      }, 2000)
    } catch (err) {
      console.error('Copy error:', err)
      alert('Could not copy Tag ID. Please copy it manually.')
    }
  }

  async function copyFullTagDetails(item) {
    const details = [
      'SMARTTAG ITEM DETAILS',
      '--------------------',
      `Item Name: ${item.item || 'Unnamed item'}`,
      `Category: ${item.category || 'Other'}`,
      `Description: ${item.description || 'No description added.'}`,
      `Owner: ${item.owner || 'Not specified'}`,
      `Registration Date: ${formatDate(item.created_at)}`,
      `SmartTag ID: ${item.id}`
    ].join('\n')

    try {
      await navigator.clipboard.writeText(details)
      setCopiedTagDetails(true)

      window.setTimeout(() => {
        setCopiedTagDetails(false)
      }, 2500)
    } catch (err) {
      console.error('Copy details error:', err)
      alert('Could not copy item details. Please try again.')
    }
  }

  function openTagDetails(item) {
    setSelectedTag(item)
    setCopiedTagId(false)
    setCopiedTagDetails(false)
  }

  function closeTagDetails() {
    setSelectedTag(null)
    setCopiedTagId(false)
    setCopiedTagDetails(false)
  }

  useEffect(() => {
    if (!selectedTag) return

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        closeTagDetails()
      }
    }

    window.addEventListener('keydown', handleEscapeKey)

    return () => {
      window.removeEventListener('keydown', handleEscapeKey)
    }
  }, [selectedTag])

  async function markNotificationRead(notification) {
    if (notification.is_read || updatingNotification !== null) return

    setUpdatingNotification(notification.id)

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id)
        .eq('owner_id', user.id)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      )
    } catch (err) {
      console.error('Notification update error:', err)
      alert(`Could not update notification: ${err.message}`)
    } finally {
      setUpdatingNotification(null)
    }
  }

  async function markAllRead() {
    if (unreadCount === 0 || updatingNotification !== null) return

    setUpdatingNotification('all')

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('owner_id', user.id)
        .eq('is_read', false)

      if (updateError) throw updateError

      setNotifications(prev =>
        prev.map(item => ({ ...item, is_read: true }))
      )
    } catch (err) {
      console.error('Mark all read error:', err)
      alert(`Could not update notifications: ${err.message}`)
    } finally {
      setUpdatingNotification(null)
    }
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    const { error: logoutError } = await supabase.auth.signOut()

    if (logoutError) {
      console.error('Logout error:', logoutError)
      alert('Logout failed. Please try again.')
      setLoggingOut(false)
      return
    }

    window.location.href = '/'
  }

  function goHome() {
    window.location.href = '/'
  }

  function navigateToSection(sectionId) {
    setActiveSection(sectionId)

    const section = document.getElementById(sectionId)

    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  function toggleFaq(index) {
    setOpenFaq(prev => prev === index ? null : index)
  }

  function refreshDashboard() {
    setRefreshing(value => !value)
  }

  function clearFilters() {
    setSearchTerm('')
    setSelectedCategory('All')
  }

  const navigation = [
    { id: 'overview', icon: '▦', label: 'Overview' },
    { id: 'my-tags', icon: '⌗', label: 'My SmartTags' },
    { id: 'notifications', icon: '♢', label: 'Notifications', count: unreadCount },
    { id: 'finder-requests', icon: '✉', label: 'Finder Requests', count: requests.length },
    { id: 'help-support', icon: '?', label: 'Help & Support' }
  ]

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <span className="dashboard-logo-icon">S</span>
          <div>
            <strong>SmartTag</strong>
            <small>OWNER PANEL</small>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        {navigation.slice(0, 4).map(link => (
          <button
            key={link.id}
            type="button"
            className={`sidebar-link ${activeSection === link.id ? 'active' : ''}`}
            onClick={() => navigateToSection(link.id)}
            style={{
              width: '100%',
              border: 'none',
              textAlign: 'left',
              font: 'inherit',
              cursor: 'pointer'
            }}
          >
            <span>{link.icon}</span>
            {link.label}

            {link.count > 0 && (
              <span className="sidebar-count">
                {link.count > 99 ? '99+' : link.count}
              </span>
            )}
          </button>
        ))}

        <div className="sidebar-label">SUPPORT</div>

        <button
          type="button"
          className={`sidebar-link ${activeSection === 'help-support' ? 'active' : ''}`}
          onClick={() => navigateToSection('help-support')}
          style={{
            width: '100%',
            border: 'none',
            textAlign: 'left',
            font: 'inherit',
            cursor: 'pointer'
          }}
        >
          <span>?</span>
          Help & Support
        </button>

        <div className="sidebar-bottom">
          <div className="dashboard-email">
            <span className="profile-circle">
              {user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <div>
              <strong>Owner Account</strong>
              <small>{user?.email || 'User'}</small>
            </div>
          </div>

          <button
            className="dashboard-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Logging out...' : '↪ Logout'}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header" id="overview">
          <div>
            <div className="dashboard-eyebrow">OWNER WORKSPACE</div>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back. Here's what's happening with your belongings.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="dashboard-back"
              onClick={refreshDashboard}
              disabled={loading}
            >
              ↻ {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="dashboard-back" onClick={goHome}>
              ← Homepage
            </button>
          </div>
        </header>

        {loading ? (
          <div className="dashboard-loading">
            <div className="dashboard-spinner"></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="dashboard-error">
            <strong>Dashboard could not load</strong>
            <p>{error}</p>
            <button className="dashboard-back" onClick={refreshDashboard}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            {sectionWarnings.length > 0 && (
              <div className="dashboard-error">
                <strong>Some sections need attention</strong>
                {sectionWarnings.map((warning, index) => (
                  <p key={index}>{warning}</p>
                ))}
                <p>Your available dashboard information is still shown below.</p>
              </div>
            )}

            <section className="dashboard-welcome-panel">
              <div>
                <span className="dashboard-eyebrow">YOUR SMARTTAG OVERVIEW</span>
                <h2>Your belongings, all in one place.</h2>
                <p>
                  Keep track of registered items and stay informed about finder activity.
                </p>
              </div>
              <div className="welcome-panel-mark">S</div>
            </section>

            <section className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">⌗</div>
                <div>
                  <span>REGISTERED ITEMS</span>
                  <h2>{items.length}</h2>
                  <small>Your active SmartTags</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✉</div>
                <div>
                  <span>FINDER REQUESTS</span>
                  <h2>{requests.length}</h2>
                  <small>Contacts received</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">♢</div>
                <div>
                  <span>UNREAD ALERTS</span>
                  <h2>{unreadCount}</h2>
                  <small>Awaiting your attention</small>
                </div>
              </div>
            </section>

            <section className="dashboard-section activity-section">
              <div className="section-heading">
                <div>
                  <h2>Recent Activity</h2>
                  <p>A quick look at recent activity on your account.</p>
                </div>
                <span className="count-badge">Latest 5</span>
              </div>

              {recentActivity.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="empty-icon">◷</div>
                  <h3>No recent activity</h3>
                  <p>Your account activity will appear here.</p>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map(activity => (
                    <article className="activity-card" key={activity.id}>
                      <span className="activity-icon">{activity.icon}</span>
                      <div className="activity-content">
                        <strong>{activity.title}</strong>
                        <p>{activity.detail}</p>
                        <small>{formatDate(activity.date)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section
              className="dashboard-section notification-section"
              id="notifications"
            >
              <div className="section-heading">
                <div>
                  <h2>Notification Center</h2>
                  <p>Stay updated whenever someone contacts you.</p>
                </div>

                <div className="notification-heading-actions">
                  <span className="count-badge">{unreadCount} Unread</span>
                  {unreadCount > 0 && (
                    <button
                      className="notification-read-all"
                      onClick={markAllRead}
                      disabled={updatingNotification !== null}
                    >
                      {updatingNotification === 'all' ? 'Updating...' : 'Mark all read'}
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="empty-icon">♢</div>
                  <h3>You're all caught up</h3>
                  <p>New finder request notifications will appear here automatically.</p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.map(notification => (
                    <article
                      className={`notification-card ${notification.is_read ? 'is-read' : 'is-unread'}`}
                      key={notification.id}
                    >
                      <div className="notification-icon">
                        {notification.type === 'finder_request' ? '✉' : '♢'}
                      </div>

                      <div className="notification-content">
                        <div className="notification-title-row">
                          <h3>{notification.title}</h3>
                          {!notification.is_read && (
                            <span className="notification-new">NEW</span>
                          )}
                        </div>

                        <p>{notification.message}</p>

                        {notification.tag_id && (
                          <small className="notification-tag">
                            Item: {getTagName(notification.tag_id)}
                          </small>
                        )}

                        <small className="notification-date">
                          {formatDate(notification.created_at)}
                        </small>
                      </div>

                      {!notification.is_read && (
                        <button
                          className="notification-read-button"
                          onClick={() => markNotificationRead(notification)}
                          disabled={updatingNotification !== null}
                        >
                          {updatingNotification === notification.id ? 'Saving...' : 'Mark read'}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section" id="my-tags">
              <div className="section-heading">
                <div>
                  <h2>My SmartTags</h2>
                  <p>All belongings registered with your account.</p>
                </div>
                <span className="count-badge">{items.length} Items</span>
              </div>

              {items.length > 0 && (
                <div className="dashboard-search">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Search by item, category or SmartTag ID..."
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    aria-label="Search SmartTags"
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {items.length > 0 && (
                <div className="dashboard-category-filters">
                  {categories.map(category => (
                    <button
                      key={category}
                      type="button"
                      className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                      {category === 'All' && (
                        <span>{items.length}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {items.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="empty-icon">⌗</div>
                  <h3>No SmartTags yet</h3>
                  <p>Your registered belongings will appear here.</p>
                  <button className="dashboard-action-button" onClick={goHome}>
                    Go to Homepage
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="dashboard-empty">
                  <h3>No matching items</h3>
                  <p>Try another search term or category.</p>
                  <button
                    className="dashboard-action-button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="dashboard-item-grid">
                  {filteredItems.map(item => (
                    <article
                      className="dashboard-item-card"
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTagDetails(item)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openTagDetails(item)
                        }
                      }}
                      aria-label={`View details for ${item.item || 'Unnamed item'}`}
                    >
                      <div className="item-card-top">
                        <span className="item-category">{item.category || 'Other'}</span>
                        <span className="item-status">● Registered</span>
                      </div>

                      <h3>{item.item || 'Unnamed item'}</h3>
                      <p className="item-owner">Owner: {item.owner || 'Not specified'}</p>
                      <p className="item-description">
                        {item.description || 'No description added.'}
                      </p>

                      <div className="item-card-footer">
                        <span>SMARTTAG ID</span>
                        <strong>{item.id}</strong>
                      </div>

                      <div className="item-date">
                        Registered: {formatDate(item.created_at)}
                      </div>

                      <div className="item-details-hint">
                        View full details →
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <p className="dashboard-filter-summary">
                  Showing {filteredItems.length} of {items.length} SmartTags
                </p>
              )}
            </section>

            <section className="dashboard-section" id="finder-requests">
              <div className="section-heading">
                <div>
                  <h2>Finder Requests</h2>
                  <p>Contact information shared by people who found your items.</p>
                </div>
                <span className="count-badge">{requests.length} Requests</span>
              </div>

              {requests.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="empty-icon">✉</div>
                  <h3>No finder requests</h3>
                  <p>New requests will appear here when someone contacts you.</p>
                </div>
              ) : (
                <div className="request-list">
                  {requests.map(request => (
                    <article className="request-card" key={request.id}>
                      <div className="request-heading">
                        <div className="request-avatar">
                          {request.finder_name?.charAt(0)?.toUpperCase() || 'F'}
                        </div>
                        <div>
                          <h3>{request.finder_name || 'Finder'}</h3>
                          <span>Found: {getTagName(request.tag_id)}</span>
                        </div>
                      </div>

                      <div className="request-contact">
                        <span>CONTACT</span>
                        <a href={`tel:${request.finder_contact || ''}`}>
                          {request.finder_contact || 'Not provided'}
                        </a>
                      </div>

                      <div className="request-message">
                        <span>MESSAGE</span>
                        <p>{request.message || 'No additional message provided.'}</p>
                      </div>

                      <div className="request-date">
                        Received: {formatDate(request.created_at)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section help-support-section" id="help-support">
              <div className="section-heading">
                <div>
                  <div className="dashboard-eyebrow">WE ARE HERE TO HELP</div>
                  <h2>Help & Support</h2>
                  <p>Find answers to common questions about your SmartTag account.</p>
                </div>
                <span className="help-support-icon">?</span>
              </div>

              <div className="help-intro">
                <div className="help-intro-icon">✦</div>
                <div>
                  <h3>Need a little help?</h3>
                  <p>
                    Browse the questions below to learn how to use your dashboard.
                  </p>
                </div>
              </div>

              <div className="faq-list">
                {faqs.map((faq, index) => (
                  <article
                    className={`faq-card ${openFaq === index ? 'faq-open' : ''}`}
                    key={index}
                  >
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={openFaq === index}
                    >
                      <span className="faq-number">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="faq-question-text">{faq.question}</span>
                      <span className="faq-toggle">
                        {openFaq === index ? '−' : '+'}
                      </span>
                    </button>

                    {openFaq === index && (
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="help-bottom-note">
                <span>ⓘ</span>
                <p>
                  Still need assistance? Please contact the SmartTag administrator.
                </p>
              </div>
            </section>
          </>
        )}

        <footer className="dashboard-footer">
          SmartTag Owner Dashboard · © {new Date().getFullYear()}
        </footer>

        {selectedTag && (
          <div
            className="tag-modal-overlay"
            onClick={closeTagDetails}
            role="presentation"
          >
            <section
              className="tag-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="tag-modal-title"
              onClick={event => event.stopPropagation()}
            >
              <div className="tag-modal-header">
                <div>
                  <span className="dashboard-eyebrow">SMARTTAG DETAILS</span>
                  <h2 id="tag-modal-title">Item Information</h2>
                </div>

                <button
                  type="button"
                  className="tag-modal-close"
                  onClick={closeTagDetails}
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>

              <div className="tag-modal-status">
                <span className="item-status">● Registered</span>
                <span className="item-category">
                  {selectedTag.category || 'Other'}
                </span>
              </div>

              <div className="tag-modal-item-name">
                <span>REGISTERED ITEM</span>
                <h3>{selectedTag.item || 'Unnamed item'}</h3>
              </div>

              <div className="tag-modal-description">
                <span>DESCRIPTION</span>
                <p>
                  {selectedTag.description || 'No description added for this item.'}
                </p>
              </div>

              <div className="tag-modal-info-grid">
                <div className="tag-modal-info">
                  <span>OWNER</span>
                  <strong>{selectedTag.owner || 'Not specified'}</strong>
                </div>

                <div className="tag-modal-info">
                  <span>REGISTRATION DATE</span>
                  <strong>{formatDate(selectedTag.created_at)}</strong>
                </div>
              </div>

              <div className="tag-modal-id">
                <div>
                  <span>YOUR SMARTTAG ID</span>
                  <strong>{selectedTag.id}</strong>
                </div>

                <button
                  type="button"
                  className="tag-copy-button"
                  onClick={() => copyTagId(selectedTag.id)}
                >
                  {copiedTagId ? '✓ Copied' : '▢ Copy ID'}
                </button>
              </div>

              <button
                type="button"
                className="tag-copy-button"
                onClick={() => copyFullTagDetails(selectedTag)}
                style={{ width: '100%', marginTop: '12px' }}
              >
                {copiedTagDetails ? '✓ Full Details Copied' : '▤ Copy Full Details'}
              </button>

              <button
                type="button"
                className="tag-modal-done"
                onClick={closeTagDetails}
              >
                Done
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default OwnerDashboard
