
import { useState } from 'react'
import { supabase } from './supabase'
import './OwnerAuth.css'

function OwnerAuth({ onLogin, onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')

  function showMessage(text, type = 'error') {
    setMessage(text)
    setMessageType(type)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (loading) return

    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !password) {
      showMessage('Please enter your email and password.')
      return
    }

    if (password.length < 6) {
      showMessage('Password must contain at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password
        })

        if (error) throw error

        if (data.session && data.user) {
          showMessage('Account created successfully!', 'success')

          if (typeof onLogin === 'function') {
            onLogin(data.user)
          }
        } else {
          showMessage(
            'Account created! Please check your email to confirm your account, then log in.',
            'success'
          )

          setMode('login')
          setPassword('')
        }

      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        })

        if (error) throw error

        if (typeof onLogin === 'function') {
          onLogin(data.user)
        }
      }

    } catch (err) {
      console.error('Authentication error:', err)

      showMessage(
        err.message || 'Something went wrong. Please try again.'
      )

    } finally {
      setLoading(false)
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setPassword('')
  }

  return (
    <div className="owner-auth-page">

      <div className="auth-container">

        <div className="auth-header">

          <button
            type="button"
            className="auth-brand"
            onClick={onBack}
          >
            <span className="auth-brand-icon">S</span>
            SmartTag
          </button>

          <button
            type="button"
            className="auth-back"
            onClick={onBack}
          >
            ← Back to Home
          </button>

        </div>

        <div className="auth-card">

          <div className="auth-card-top">
            <span className="auth-eyebrow">
              OWNER ACCOUNT
            </span>

            <h1>
              {mode === 'login'
                ? 'Welcome Back'
                : 'Create Your Account'}
            </h1>

            <p>
              {mode === 'login'
                ? 'Log in to manage your registered SmartTags.'
                : 'Create an account to register and manage your belongings.'}
            </p>
          </div>

          <div className="auth-tabs">

            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => changeMode('login')}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => changeMode('signup')}
            >
              Sign Up
            </button>

          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <div className="auth-field">

              <label htmlFor="auth-email">
                Email Address
              </label>

              <input
                id="auth-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

            </div>

            <div className="auth-field">

              <label htmlFor="auth-password">
                Password
              </label>

              <div className="auth-password-wrapper">

                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={
                    mode === 'login'
                      ? 'current-password'
                      : 'new-password'
                  }
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>

              </div>

              <small>Minimum 6 characters</small>

            </div>

            {message && (
              <div
                className={
                  messageType === 'success'
                    ? 'auth-message success'
                    : 'auth-message error'
                }
                role="alert"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Login to Account →'
                  : 'Create Account →'}
            </button>

          </form>

          <div className="auth-switch">

            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signup')}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('login')}
                >
                  Login
                </button>
              </>
            )}

          </div>

        </div>

        <p className="auth-footer">
          © {new Date().getFullYear()} SmartTag. All rights reserved.
        </p>

      </div>

    </div>
  )
}

export default OwnerAuth
