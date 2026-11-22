
import { useState } from 'react'
import './Donation.css'

function Donation() {
  const [amount, setAmount] = useState(50)
  const [customAmount, setCustomAmount] = useState('')

  const amounts = [20, 50, 100, 200, 500]

  const selectedAmount = customAmount
    ? Number(customAmount)
    : amount

  function handleDonate() {
    alert(
      'Thank you for supporting SmartTag! Donation payments will be available soon.'
    )
  }

  return (
    <section className="donation-section" id="donate">
      <div className="donation-container">

        <div className="donation-content">
          <span className="donation-label">
            SUPPORT SMARTTAG
          </span>

          <h2>
            Help us make
            <span> lost things found.</span>
          </h2>

          <p>
            Your support can help us improve SmartTag and make
            lost-and-found services more accessible to everyone.
          </p>

          <div className="donation-features">
            <div>
              <span>01</span>
              <p>Improve SmartTag technology</p>
            </div>

            <div>
              <span>02</span>
              <p>Make finding lost belongings easier</p>
            </div>

            <div>
              <span>03</span>
              <p>Support future development</p>
            </div>
          </div>
        </div>

        <div className="donation-card">
          <h3>Make a Donation</h3>
          <p>Choose an amount to support our project.</p>

          <div className="donation-amounts">
            {amounts.map(value => (
              <button
                key={value}
                type="button"
                className={
                  !customAmount && amount === value
                    ? 'selected'
                    : ''
                }
                onClick={() => {
                  setAmount(value)
                  setCustomAmount('')
                }}
              >
                ₹{value}
              </button>
            ))}
          </div>

          <label htmlFor="custom-donation">
            Custom amount
          </label>

          <input
            id="custom-donation"
            type="number"
            min="1"
            placeholder="Enter amount in ₹"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
          />

          <div className="donation-total">
            <span>Your contribution</span>
            <strong>
              ₹{Number.isFinite(selectedAmount) && selectedAmount > 0
                ? selectedAmount.toFixed(2)
                : '0.00'}
            </strong>
          </div>

          <button
            className="donate-button"
            type="button"
            onClick={handleDonate}
            disabled={
              !Number.isFinite(selectedAmount) ||
              selectedAmount <= 0
            }
          >
            Continue to Donate
          </button>

          <small>
            Secure payment options will be added after payment setup.
          </small>
        </div>

      </div>
    </section>
  )
}

export default Donation
