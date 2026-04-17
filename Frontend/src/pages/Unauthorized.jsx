import { Link } from 'react-router-dom'

function Unauthorized() {
  return (
    <section className="panel">
      <p className="section-label">Access denied</p>
      <h2>You do not have permission for this page.</h2>
      <p className="section-copy">Return to your dashboard or sign in with a role that has access.</p>
      <p className="auth-alt">
        <Link to="/">Go to dashboard</Link>
      </p>
    </section>
  )
}

export default Unauthorized
