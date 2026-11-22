
import { useState } from 'react'
import { supabase } from './supabase'
import './TagPage.css'

function TagPage({ tag, onSuccess }) {
  const [form, setForm] = useState({
    finder_name: '',
    finder_contact: '',
    message: ''
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    const { name, value } = e.target

    setForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (loading || success) return

    setLoading(true)
    setError('')

    try {
      const name = form.finder_name.trim()
      const contact = form.finder_contact.trim()
      const message = form.message.trim()

      if (!name || !contact) {
        setError('Please enter your name and contact details.')
        return
      }

      if (!tag?.id) {
        setError('SmartTag information is missing. Please scan the QR again.')
        return
      }

      const { error: requestError } = await supabase
        .from('contact_requests')
        .insert({
          tag_id: tag.id,
          finder_name: name,
          finder_contact: contact,
          message: message || null
        })

      if (requestError) {
        throw requestError
      }

      setSuccess(true)

      window.setTimeout(() => {
        if (typeof onSuccess === 'function') {
          onSuccess()
        } else {
          window.location.href = '/'
        }
      }, 1500)

    } catch (err) {
      console.error('Finder request error:', err)
      setError('Your request could not be sent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!tag) {
    return (
      <div className="finder-page">
        <div className="finder-box">
          <h2>SmartTag not found</h2>
          <p>This QR code does not have a registered item.</p>
          <button onClick={() => window.location.href = '/'}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="finder-page">
      <div className="finder-container">

        <header className="finder-header">
          <div className="finder-brand">
            <span className="finder-logo">S</span>
            <span>SmartTag</span>
          </div>

          <span className="finder-status">
            Registered Item
          </span>
        </header>

        <section className="finder-content">

          <div className="finder-intro">
            <span className="finder-eyebrow">
              LOST & FOUND
            </span>

            <h1>Help this item find its owner.</h1>

            <p>
              You have scanned a SmartTag. The details below identify
              the registered belonging. Send a message to help return it.
            </p>
          </div>

          <div className="finder-item-card">
            <span className="finder-card-label">ITEM DETAILS</span>

            <h2>{tag.item}</h2>

            <div className="finder-detail-row">
              <span>Owner</span>
              <strong>{tag.owner}</strong>
            </div>

            <div className="finder-detail-row">
              <span>Category</span>
              <strong>{tag.category}</strong>
            </div>

            {tag.description && (
              <div className="finder-description">
                <span>Description</span>
                <p>{tag.description}</p>
              </div>
            )}

            <div className="finder-tag-id">
              SmartTag ID: {tag.id}
            </div>
          </div>

          <div className="finder-form-card">

            <div className="finder-form-heading">
              <span>CONTACT THE OWNER</span>
              <h2>Send a Finder Request</h2>
              <p>
                Your contact details will be shared with the item owner
                through their dashboard.
              </p>
            </div>

            {success && (
              <div className="finder-success" role="status">
                <strong>✓ Request sent successfully!</strong>
                <p>Thank you for helping return this item.</p>
                <small>Returning to homepage...</small>
              </div>
            )}

            {error && (
              <div className="finder-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <label htmlFor="finder_name">Your Name *</label>
              <input
                id="finder_name"
                type="text"
                name="finder_name"
                value={form.finder_name}
                onChange={handleChange}
                placeholder="Enter your name"
                maxLength={80}
                required
                disabled={loading || success}
              />

              <label htmlFor="finder_contact">
                Mobile Number or Email *
              </label>
              <input
                id="finder_contact"
                type="text"
                name="finder_contact"
                value={form.finder_contact}
                onChange={handleChange}
                placeholder="How can the owner contact you?"
                maxLength={120}
                required
                disabled={loading || success}
              />

              <label htmlFor="finder_message">
                Message (Optional)
              </label>
              <textarea
                id="finder_message"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Where did you find this item?"
                rows={4}
                maxLength={500}
                disabled={loading || success}
              />

              <button
                type="submit"
                disabled={loading || success}
              >
                {loading
                  ? 'Sending Request...'
                  : success
                    ? 'Request Sent ✓'
                    : 'Send Finder Request →'}
              </button>

            </form>

            <p className="finder-privacy">
              Please share only the contact details needed for the owner
              to reach you.
            </p>

          </div>
        </section>

        <footer className="finder-footer">
          Smart Identification. Safer Belongings.
        </footer>

      </div>
    </main>
  )
}

export default TagPage
