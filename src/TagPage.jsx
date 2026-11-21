
import { useState } from 'react'
import { supabase } from './supabase'

function TagPage({ tag }) {
  const [finder, setFinder] = useState({
    name: '',
    contact: '',
    message: ''
  })

  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setFinder({
      ...finder,
      [e.target.name]: e.target.value
    })
  }

  async function sendRequest(e) {
    e.preventDefault()
    setLoading(true)
    setStatus('')

    const { error } = await supabase
      .from('contact_requests')
      .insert({
        tag_id: tag.id,
        finder_name: finder.name.trim(),
        finder_contact: finder.contact.trim(),
        message: finder.message.trim() || null
      })

    if (error) {
      setStatus('Error: ' + error.message)
console.error('Contact request error:', error)
    } else {
      setStatus('Contact request sent successfully!')
      setFinder({
        name: '',
        contact: '',
        message: ''
      })
    }

    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#09090d',
      color: 'white',
      padding: '40px 20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '520px',
        margin: '30px auto',
        background: '#17171f',
        padding: '30px',
        borderRadius: '16px'
      }}>
        <h1 style={{ color: '#ff303c' }}>
          SmartTag
        </h1>

        <p>Registered Item Found!</p>

        <hr />

        <h2>{tag.item}</h2>

        <p><b>Owner:</b> {tag.owner}</p>
        <p><b>Category:</b> {tag.category}</p>

        {tag.description && (
          <p><b>Description:</b> {tag.description}</p>
        )}

        <p style={{ color: '#aaa' }}>
          Tag ID: {tag.id}
        </p>

        <hr />

        <h3>Contact Owner</h3>

        <p style={{ color: '#aaa' }}>
          Send a contact request to the owner.
          Their private phone number will not be displayed.
        </p>

        {status && (
          <p style={{ color: '#ff6973' }}>{status}</p>
        )}

        <form onSubmit={sendRequest}>
          <label>Your Name</label>
          <input
            name="name"
            value={finder.name}
            onChange={handleChange}
            required
            placeholder="Enter your name"
            style={inputStyle}
          />

          <label>Your Contact Details</label>
          <input
            name="contact"
            value={finder.contact}
            onChange={handleChange}
            required
            placeholder="Phone or email"
            style={inputStyle}
          />

          <label>Message (Optional)</label>
          <textarea
            name="message"
            value={finder.message}
            onChange={handleChange}
            placeholder="I found your item..."
            rows={4}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
          >
            {loading ? 'Sending...' : 'Contact Owner'}
          </button>
        </form>
      </div>
    </main>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  margin: '10px 0 18px',
  borderRadius: '7px',
  border: '1px solid #444',
  background: '#252530',
  color: 'white'
}

const buttonStyle = {
  width: '100%',
  padding: '14px',
  background: '#ff303c',
  color: 'white',
  border: 'none',
  borderRadius: '7px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

export default TagPage
