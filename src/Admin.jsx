
import { useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { supabase } from './supabase'

function Admin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(100)
  const [codes, setCodes] = useState([])
  const [message, setMessage] = useState('')

  async function adminLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Step 1: Sign in
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

      if (error) throw error

      if (!data.user) {
        throw new Error('Login successful, but user details were not found.')
      }

      // Step 2: Verify admin UID
      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (adminError) {
        throw new Error(
          'Admin table error: ' + adminError.message
        )
      }

      if (!admin) {
        await supabase.auth.signOut()
        throw new Error(
          'This account is not registered as an Admin. Please check admin_users table.'
        )
      }

      setIsAdmin(true)
      setPassword('')
      setMessage('Admin login successful!')

    } catch (error) {
      console.error('Admin login error:', error)
      setMessage(error.message || 'Admin login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function generateQRs() {
    if (!Number.isInteger(Number(count)) || count < 1 || count > 500) {
      setMessage('Please enter a number between 1 and 500.')
      return
    }

    setLoading(true)
    setCodes([])
    setMessage('')

    try {
      const newCodes = []

      for (let i = 0; i < Number(count); i++) {
        const id = `ST-${crypto.randomUUID()}`

        const tagUrl = new URL('/', window.location.origin)
        tagUrl.searchParams.set('tag', id)

        newCodes.push({
          id,
          url: tagUrl.toString()
        })
      }

      // Save IDs in Supabase first
      const records = newCodes.map(item => ({
        id: item.id,
        is_registered: false
      }))

      const { error } = await supabase
        .from('qr_codes')
        .insert(records)

      if (error) throw error

      // Generate QR images
      const completedCodes = []

      for (const item of newCodes) {
        const qr = await QRCode.toDataURL(item.url, {
          width: 400,
          margin: 2,
          errorCorrectionLevel: 'H'
        })

        completedCodes.push({
          ...item,
          qr
        })
      }

      setCodes(completedCodes)
      setMessage(`${completedCodes.length} unique QR codes generated and saved!`)

    } catch (error) {
      console.error('QR generation error:', error)
      setMessage('QR generation failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadPDF() {
    if (!codes.length) {
      setMessage('Please generate QR codes first.')
      return
    }

    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const columns = 3
    const rows = 4
    const perPage = columns * rows
    const cellWidth = pageWidth / columns
    const cellHeight = pageHeight / rows

    codes.forEach((item, index) => {
      const pageIndex = Math.floor(index / perPage)

      if (index > 0 && index % perPage === 0) {
        pdf.addPage()
      }

      const position = index % perPage
      const col = position % columns
      const row = Math.floor(position / columns)

      const x = col * cellWidth
      const y = row * cellHeight

      pdf.setFontSize(10)
      pdf.text(item.id, x + cellWidth / 2, y + 12, {
        align: 'center'
      })

      const imageSize = 42
      pdf.addImage(
        item.qr,
        'PNG',
        x + (cellWidth - imageSize) / 2,
        y + 17,
        imageSize,
        imageSize
      )
    })

    pdf.save('SmartTag-QR-Codes.pdf')
  }

  async function adminLogout() {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setIsAdmin(false)
      setCodes([])
      setEmail('')
      setPassword('')
      setMessage('Logged out successfully.')

    } catch (error) {
      setMessage('Logout error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '420px',
        margin: '50px auto',
        padding: '25px',
        background: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ textAlign: 'center' }}>SmartTag Admin Login</h2>

        <form onSubmit={adminLogin}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Checking...' : 'Login as Admin'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '15px', textAlign: 'center', color: '#c0392b' }}>
            {message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '900px',
      margin: '30px auto',
      padding: '25px',
      background: '#ffffff',
      borderRadius: '14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
    }}>
      <h2>SmartTag QR Generator</h2>

      <button
        onClick={adminLogout}
        disabled={loading}
        style={{ ...buttonStyle, background: '#555', marginBottom: '20px' }}
      >
        Logout
      </button>

      <label>Number of QR codes (1–500)</label>

      <input
        type="number"
        min="1"
        max="500"
        value={count}
        onChange={e => setCount(Number(e.target.value))}
        style={inputStyle}
      />

      <button
        onClick={generateQRs}
        disabled={loading}
        style={buttonStyle}
      >
        {loading ? 'Please wait...' : 'Generate QR Codes'}
      </button>

      {message && <p>{message}</p>}

      {codes.length > 0 && (
        <>
          <h3>{codes.length} QR Codes Generated</h3>

          <button
            onClick={downloadPDF}
            style={{ ...buttonStyle, background: '#198754' }}
          >
            Download PDF
          </button>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '20px',
            marginTop: '25px'
          }}>
            {codes.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #ddd',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center'
                }}
              >
                <img
                  src={item.qr}
                  alt={item.id}
                  style={{ width: '100%', maxWidth: '140px' }}
                />
                <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  {item.id}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px',
  margin: '15px 0',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '15px'
}

const buttonStyle = {
  width: '100%',
  padding: '13px',
  border: 'none',
  borderRadius: '8px',
  background: '#2563eb',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

export default Admin
