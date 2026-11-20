
import { useState } from 'react'
import { supabase } from './supabase'

function OwnerAuth({ onLogin, onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      })

      if (error) {
        setMessage(error.message)
      } else if (data.session) {
        onLogin(data.user)
      } else {
        setMessage('Signup successful! Please confirm your email, then log in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        setMessage(error.message)
      } else {
        onLogin(data.user)
      }
    }

    setLoading(false)
  }

  return (
    <main className="tag-status">
      <button type="button" onClick={onBack}>
        ← Back to Home
      </button>

      <h2>Smart<span>Tag</span> Owner Account</h2>
      <h3>{mode === 'login' ? 'Owner Login' : 'Create Owner Account'}</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login')
          setMessage('')
        }}
      >
        {mode === 'login'
          ? 'Create a new account'
          : 'Already have an account? Login'}
      </button>
    </main>
  )
}

export default OwnerAuth
