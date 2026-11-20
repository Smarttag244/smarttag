
import { useState } from 'react'
import './Register.css'
import { supabase } from './supabase'

function Register({ tagId }) {
  const [form, setForm] = useState({
    owner: '',
    item: '',
    category: '',
    phone: '',
    description: ''
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

    // Check logged-in owner
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
      if (error.code === '23505') {
        setMessage('This SmartTag is already registered.')
      } else {
        setMessage('Registration failed: ' + error.message)
      }

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
        setMessage('Item saved, but private contact details could not be saved. Please contact admin.')
        setLoading(false)
        return
      }
    }

    setMessage('Registration successful! Your SmartTag is now active.')

    setLoading(false)
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
          <div className="success-message">
            {message}
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
            disabled={loading}
          />

          <label>Item Name *</label>
          <input
            type="text"
            name="item"
            value={form.item}
            onChange={handleChange}
            placeholder="e.g. School Bag"
            required
            disabled={loading}
          />

          <label>Item Category *</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            disabled={loading}
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
            disabled={loading}
          />

          <label>Item Description (Optional)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your item..."
            rows={4}
            disabled={loading}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register My Item →'}
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
