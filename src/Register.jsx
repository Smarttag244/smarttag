
import { useState } from 'react'
import { supabase } from './supabase'
import './Register.css'

function Register({ tagId, onSuccess }) {
  const [form, setForm] = useState({
    owner: '',
    item: '',
    category: '',
    phone: '',
    description: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [warning, setWarning] = useState('')

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

    setError('')
    setWarning('')

    const owner = form.owner.trim()
    const item = form.item.trim()
    const category = form.category.trim()
    const phone = form.phone.trim()
    const description = form.description.trim()

    if (!tagId) {
      setError('SmartTag QR ID is missing. Please scan your QR again.')
      return
    }

    if (!owner || !item || !category) {
      setError('Please fill in all required fields.')
      return
    }

    if (phone && !/^[0-9]{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData?.user) {
        throw new Error(
          'Please login to your Owner Account before registering your SmartTag.'
        )
      }

      const { error: registerError } = await supabase
        .from('smarttags')
        .insert({
          id: tagId,
          owner_id: authData.user.id,
          owner,
          item,
          category,
          description: description || null
        })

      if (registerError) {
        if (registerError.code === '23505') {
          throw new Error('This SmartTag has already been registered.')
        }

        throw registerError
      }

      // Phone number is optional
      if (phone) {
        const { error: phoneError } = await supabase
          .from('tag_contacts')
          .insert({
            tag_id: tagId,
            phone
          })

        if (phoneError) {
          console.error('Phone save error:', phoneError)

          setWarning(
            'Your SmartTag is registered, but the contact number could not be saved.'
          )
        }
      }

      setSuccess(true)

      window.setTimeout(() => {
        if (typeof onSuccess === 'function') {
          onSuccess()
        } else {
          window.location.href = '/'
        }
      }, 1800)

    } catch (err) {
      console.error('Registration error:', err)

      setError(
        err.message || 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">

      <div className="register-container">

        <div className="register-header">
          <button
            type="button"
            className="register-brand"
            onClick={() => {
              if (typeof onSuccess === 'function') {
                onSuccess()
              } else {
                window.location.href = '/'
              }
            }}
          >
            <span className="register-brand-icon">S</span>
            SmartTag
          </button>

          <span className="register-header-label">
            OWNER REGISTRATION
          </span>
        </div>

        <div className="register-box">

          {!success ? (
            <>
              <div className="register-heading">
                <span className="register-label">
                  GET STARTED
                </span>

                <h1>Register Your SmartTag</h1>

                <p>
                  Add your item details to connect it with your
                  unique SmartTag QR code.
                </p>
              </div>

              <div className="register-qr-info">
                <span className="register-qr-icon">⌗</span>

                <div>
                  <small>YOUR SMARTTAG ID</small>
                  <strong>{tagId || 'QR ID unavailable'}</strong>
                </div>
              </div>

              <form onSubmit={handleSubmit}>

                <div className="register-fields">

                  <div className="form-field">
                    <label htmlFor="owner">Owner Name *</label>
                    <input
                      id="owner"
                      type="text"
                      name="owner"
                      placeholder="Enter your name"
                      value={form.owner}
                      onChange={handleChange}
                      maxLength={80}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="item">Item Name *</label>
                    <input
                      id="item"
                      type="text"
                      name="item"
                      placeholder="e.g. School Bag"
                      value={form.item}
                      onChange={handleChange}
                      maxLength={100}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    >
                      <option value="">Select category</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Bags">Bags</option>
                      <option value="Documents">Documents</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Keys">Keys</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="phone">
                      Contact Number <span>(Optional)</span>
                    </label>

                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength={10}
                      inputMode="numeric"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-field form-field-full">
                    <label htmlFor="description">
                      Item Description <span>(Optional)</span>
                    </label>

                    <textarea
                      id="description"
                      name="description"
                      placeholder="Add identifying details about your item..."
                      value={form.description}
                      onChange={handleChange}
                      maxLength={500}
                      rows={4}
                      disabled={loading}
                    />
                  </div>

                </div>

                {error && (
                  <div className="register-error" role="alert">
                    {error}
                  </div>
                )}

                {warning && (
                  <div className="register-warning" role="status">
                    {warning}
                  </div>
                )}

                <button
                  type="submit"
                  className="register-submit"
                  disabled={loading || !tagId}
                >
                  {loading
                    ? 'Registering...'
                    : 'Complete Registration →'}
                </button>

                <p className="register-privacy">
                  Your information is used to help identify your
                  registered item. Avoid adding sensitive personal details.
                </p>

              </form>
            </>
          ) : (
            <div className="register-success">
              <div className="register-success-icon">✓</div>

              <h2>Registration Successful!</h2>

              <p>
                Your SmartTag has been registered successfully.
                Redirecting you to the homepage...
              </p>

              {warning && (
                <div className="register-warning">
                  {warning}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="register-footer">
          © {new Date().getFullYear()} SmartTag. All rights reserved.
        </div>

      </div>
    </div>
  )
}

export default Register
s