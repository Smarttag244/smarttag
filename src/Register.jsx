
import { useState } from 'react'
import './Register.css'
import { supabase } from './supabase'

function Register({ tagId, onSuccess }) {
  const [form, setForm] = useState({
    owner: '',
    item: '',
    category: '',
    phone: '',
    description: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)
    setMessage('')
    setSuccess(false)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setMessage('Please login to your Owner Account before registering an item.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('smarttags')
        .insert({
          id: tagId,
          owner_id: authData.user.id,
          owner: form.owner.trim(),
          item: form.item.trim(),
          category: form.category,
          description: form.description.trim() || null
        })

      if (error) {
        setMessage(
          error.code === '23505'
            ? 'This SmartTag is already registered.'
            : 'Registration failed: ' + error.message
        )
        setLoading(false)
        return
      }

      if (form.phone.trim()) {
        const { error: contactError } = await supabase
          .from('tag_contacts')
          .insert({
            tag_id: tagId,
            phone: form.phone.trim()
          })

        if (contactError) {
          setMessage(
            'Item saved, but private contact details could not be saved. Please contact admin.'
          )
          setLoading(false)
          return
        }
      }

      setSuccess(true)
      setMessage('Registration Successful! Your SmartTag is now active.')
      setLoading(false)

      window.setTimeout(() => {
        if (typeof onSuccess === 'function') {
          onSuccess()
        } else {
          window.location.href = 'https://smarttag-phi.vercel.app/'
        }
      }, 1500)

    } catch (error) {
      setMessage('Something went wrong: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <section className="register-section">
      <div className="register-box">

        <div className="register-heading">
          <span>SMARTTAG REGISTRATION</span>
          <h2>Register Your <b>Item</b></h2>
          <p>Give your belongings a unique digital identity.</p>
        </div>

        <p>Tag ID: <strong>{tagId}</strong></p>

        {message && (
          <div
            className="success-message"
            role="status"
            style={{
              padding: '12px',
              marginBottom: '15px',
              borderRadius: '8px',
              backgroundColor: success ? '#dcfce7' : '#fee2e2',
              color: success ? '#166534' : '#991b1b'
            }}
          >
            {success && '✓ '}
            {message}

            {success && (
              <p style={{ marginBottom: 0, fontSize: '13px' }}>
                Redirecting to homepage...
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label>Owner Name *</label>
          <input
            type="text"
            name="owner"
            value={form.owner}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
            disabled={loading || success}
          />

          <label>Item Name *</label>
          <input
            type="text"
            name="item"
            value={form.item}
            onChange={handleChange}
            placeholder="e.g. School Bag"
            required
            disabled={loading || success}
          />

          <label>Item Category *</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            disabled={loading || success}
          >
            <option value="">Choose category</option>
            <option value="Electronics">Electronics</option>
            <option value="School Supplies">School Supplies</option>
            <option value="Personal Belongings">Personal Belongings</option>
            <option value="Vehicles">Vehicles</option>
            <option value="Other">Other</option>
          </select>

          <label>Mobile Number (Optional)</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Enter 10-digit mobile number"
            maxLength={10}
            pattern="[0-9]{10}"
            disabled={loading || success}
          />

          <label>Item Description (Optional)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your item..."
            rows={4}
            disabled={loading || success}
          />

          <button type="submit" disabled={loading || success}>
            {loading
              ? 'Registering...'
              : success
                ? 'Registration Complete ✓'
                : 'Register My Item →'}
          </button>

        </form>

        <small>
          Your phone number is stored separately and is not shown publicly.
        </small>

      </div>
    </section>
  )
}

export default Register
