import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessSpeciality, setBusinessSpeciality] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await register({ name, email, password, businessSpeciality })
      navigate('/', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <p className="section-label">Create account</p>
      <h2>Register for LeadForge AI</h2>
      <p className="section-copy">Set up your account and start working your lead pipeline.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="input-group">
          <span>Full name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
          />
        </label>

        <label className="input-group">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
          />
        </label>

        <label className="input-group">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 6 characters"
          />
        </label>

        <label className="input-group">
          <span>Business speciality</span>
          <input
            type="text"
            required
            maxLength={180}
            value={businessSpeciality}
            onChange={(event) => setBusinessSpeciality(event.target.value)}
            placeholder="e.g. AI chatbot services, digital growth consulting, website optimization"
          />
        </label>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      {error ? <p className="empty-state">Error: {error}</p> : null}
      <p className="auth-alt">
        Already registered? <Link to="/login">Login</Link>
      </p>
    </section>
  )
}

export default Register
