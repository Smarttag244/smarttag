
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { supabase } from './supabase'
import './Admin.css'

function Admin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('qr')

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)

  const [count, setCount] = useState(12)
  const [qrCodes, setQrCodes] = useState([])

  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [balance, setBalance] = useState(0)
  const [totalDonations, setTotalDonations] = useState(0)
  const [totalWithdrawals, setTotalWithdrawals] = useState(0)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [upiId, setUpiId] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function verifyAdmin(sessionUser) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', sessionUser.id)
      .maybeSingle()

    if (error || !data) {
      await supabase.auth.signOut()
      setUser(null)
      setError('You do not have admin access.')
      return false
    }

    setUser(sessionUser)
    setError('')
    return true
  }

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()

      if (data.session?.user) {
        await verifyAdmin(data.session.user)
      }
    }

    checkSession()
  }, [])

  async function adminLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      await verifyAdmin(data.user)
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function generateQRs() {
    const total = Number(count)

    if (!Number.isInteger(total) || total < 1 || total > 100) {
      setError('Please enter a number between 1 and 100.')
      return
    }

    setGenerating(true)
    setError('')
    setMessage('')
    setQrCodes([])

    try {
      const newCodes = []

      for (let i = 0; i < total; i++) {
        const { data, error } = await supabase
          .from('qr_codes')
          .insert({ is_registered: false })
          .select()
          .single()

        if (error) throw error

        const url = `${window.location.origin}/?tag=${data.id}`
        const qr = await QRCode.toDataURL(url, {
          width: 300,
          margin: 2
        })

        newCodes.push({
          id: data.id,
          qr
        })
      }

      setQrCodes(newCodes)
      setMessage(`${newCodes.length} QR codes generated.`)
    } catch (err) {
      setError(err.message || 'QR generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  function downloadPDF() {
    if (!qrCodes.length) return

    const pdf = new jsPDF('p', 'mm', 'a4')

    const pageWidth = 210
    const marginX = 15
    const marginY = 15
    const cellWidth = 60
    const cellHeight = 65
    const qrSize = 42

    qrCodes.forEach((item, index) => {
      const pageIndex = Math.floor(index / 9)

      if (index > 0 && index % 9 === 0) {
        pdf.addPage()
      }

      const position = index % 9
      const col = position % 3
      const row = Math.floor(position / 3)

      const x = marginX + col * cellWidth
      const y = marginY + row * cellHeight

      pdf.addImage(
        item.qr,
        'PNG',
        x + 7,
        y,
        qrSize,
        qrSize
      )

      pdf.setFontSize(8)
      pdf.text(
        `SMARTTAG`,
        x + cellWidth / 2,
        y + 47,
        { align: 'center' }
      )

      pdf.setFontSize(6)
      pdf.text(
        item.id,
        x + cellWidth / 2,
        y + 53,
        { align: 'center' }
      )
    })

    pdf.save('SmartTag-QR-Codes.pdf')
  }

  async function loadWallet() {
    if (!user) return

    setWalletLoading(true)
    setError('')

    try {
      const [transactionResult, withdrawalResult] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('wallet_withdrawals')
          .select('*')
          .order('created_at', { ascending: false })
      ])

      if (transactionResult.error) throw transactionResult.error
      if (withdrawalResult.error) throw withdrawalResult.error

      const allTransactions = transactionResult.data || []
      const allWithdrawals = withdrawalResult.data || []

      const donations = allTransactions
        .filter(item =>
          item.transaction_type === 'donation' &&
          item.status === 'successful'
        )
        .reduce((sum, item) => sum + Number(item.amount), 0)

      const paid = allWithdrawals
        .filter(item => item.status === 'paid')
        .reduce((sum, item) => sum + Number(item.amount), 0)

      const reserved = allWithdrawals
        .filter(item =>
          ['pending', 'approved', 'paid'].includes(item.status)
        )
        .reduce((sum, item) => sum + Number(item.amount), 0)

      setTransactions(allTransactions)
      setWithdrawals(allWithdrawals)
      setTotalDonations(donations)
      setTotalWithdrawals(paid)
      setBalance(Math.max(0, donations - reserved))
    } catch (err) {
      setError(err.message || 'Unable to load wallet.')
    } finally {
      setWalletLoading(false)
    }
  }

  useEffect(() => {
    if (user && activeTab === 'wallet') {
      loadWallet()
    }
  }, [user, activeTab])

  async function requestWithdrawal(e) {
    e.preventDefault()

    setError('')
    setMessage('')

    const amount = Number(withdrawAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    if (!upiId.trim()) {
      setError('Please enter your UPI ID.')
      return
    }

    setWalletLoading(true)

    try {
      const { error } = await supabase.rpc(
        'request_wallet_withdrawal',
        {
          p_amount: amount,
          p_upi_id: upiId.trim()
        }
      )

      if (error) throw error

      setMessage('Withdrawal request submitted successfully.')
      setWithdrawAmount('')
      setUpiId('')

      await loadWallet()
    } catch (err) {
      setError(err.message || 'Unable to submit withdrawal request.')
    } finally {
      setWalletLoading(false)
    }
  }

  async function adminLogout() {
    await supabase.auth.signOut()

    setUser(null)
    setEmail('')
    setPassword('')
    setQrCodes([])
    setTransactions([])
    setWithdrawals([])
    setBalance(0)
    setActiveTab('qr')
    setError('')
    setMessage('')
  }

  if (!user) {
    return (
      <section className="admin-panel">
        <div className="admin-login-card">
          <h2>SmartTag Admin</h2>
          <p>Sign in to access the administration panel.</p>

          <form onSubmit={adminLogin}>
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Admin Login'}
            </button>
          </form>

          {error && <p className="admin-error">{error}</p>}
        </div>
      </section>
    )
  }

  return (
    <section className="admin-panel">
      <div className="admin-dashboard">

        <div className="admin-header">
          <div>
            <h2>SmartTag Admin Panel</h2>
            <p>{user.email}</p>
          </div>

          <button onClick={adminLogout} className="admin-logout">
            Logout
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === 'qr' ? 'active' : ''}
            onClick={() => {
              setActiveTab('qr')
              setError('')
              setMessage('')
            }}
          >
            QR Management
          </button>

          <button
            className={activeTab === 'wallet' ? 'active' : ''}
            onClick={() => {
              setActiveTab('wallet')
              setError('')
              setMessage('')
            }}
          >
            Donation Wallet
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}
        {message && <p className="admin-success">{message}</p>}

        {activeTab === 'qr' && (
          <div className="admin-qr-section">
            <h3>Generate SmartTag QR Codes</h3>

            <label>Number of QR codes</label>

            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={e => setCount(e.target.value)}
            />

            <button
              onClick={generateQRs}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate QR Codes'}
            </button>

            {qrCodes.length > 0 && (
              <>
                <div className="admin-qr-grid">
                  {qrCodes.map(item => (
                    <div className="admin-qr-card" key={item.id}>
                      <img src={item.qr} alt="SmartTag QR Code" />
                      <p>{item.id}</p>
                    </div>
                  ))}
                </div>

                <button onClick={downloadPDF}>
                  Download PDF
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="admin-wallet-section">
            <div className="wallet-heading">
              <div>
                <h3>Donation Wallet</h3>
                <p>Admin-only wallet overview</p>
              </div>

              <button
                onClick={loadWallet}
                disabled={walletLoading}
              >
                {walletLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="wallet-balance-card">
              <p>Available Balance</p>
              <h2>₹{balance.toFixed(2)}</h2>
              <small>Based on recorded successful donations and reserved requests</small>
            </div>

            <div className="wallet-stats">
              <div>
                <span>Total Donations</span>
                <strong>₹{totalDonations.toFixed(2)}</strong>
              </div>

              <div>
                <span>Paid Withdrawals</span>
                <strong>₹{totalWithdrawals.toFixed(2)}</strong>
              </div>
            </div>

            <form
              className="wallet-withdraw-form"
              onSubmit={requestWithdrawal}
            >
              <h4>Request Withdrawal</h4>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Withdrawal amount (₹)"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="UPI ID"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                required
              />

              <button type="submit" disabled={walletLoading}>
                {walletLoading ? 'Submitting...' : 'Submit Request'}
              </button>

              <p>
                Requests are recorded for review. This does not transfer money.
              </p>
            </form>

            <div className="wallet-history">
              <h4>Donation Transactions</h4>

              {transactions.length === 0 ? (
                <p>No donation transactions found.</p>
              ) : (
                transactions.map(item => (
                  <div className="wallet-history-row" key={item.id}>
                    <div>
                      <strong>{item.transaction_type}</strong>
                      <small>
                        {new Date(item.created_at).toLocaleString()}
                      </small>
                    </div>

                    <div>
                      <strong>₹{Number(item.amount).toFixed(2)}</strong>
                      <small>{item.status}</small>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="wallet-history">
              <h4>Withdrawal Requests</h4>

              {withdrawals.length === 0 ? (
                <p>No withdrawal requests found.</p>
              ) : (
                withdrawals.map(item => (
                  <div className="wallet-history-row" key={item.id}>
                    <div>
                      <strong>₹{Number(item.amount).toFixed(2)}</strong>
                      <small>{item.upi_id}</small>
                    </div>

                    <div>
                      <strong>{item.status}</strong>
                      <small>
                        {new Date(item.created_at).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  )
}

export default Admin
