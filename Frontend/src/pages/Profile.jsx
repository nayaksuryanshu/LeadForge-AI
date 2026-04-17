import { useAuth } from '../context/AuthContext'

function Profile() {
  const { user } = useAuth()

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="section-label">Profile</p>
          <h2>Your account details</h2>
          <p className="section-copy">Only you can access this profile while authenticated.</p>
        </div>
      </header>

      <div className="profile-grid">
        <article className="profile-item">
          <span>Name</span>
          <strong>{user?.name || '-'}</strong>
        </article>
        <article className="profile-item">
          <span>Email</span>
          <strong>{user?.email || '-'}</strong>
        </article>
        <article className="profile-item">
          <span>Role</span>
          <strong>{user?.role || '-'}</strong>
        </article>
        <article className="profile-item">
          <span>Business speciality</span>
          <strong>{user?.businessSpeciality || '-'}</strong>
        </article>
        <article className="profile-item">
          <span>User ID</span>
          <strong>{user?.id || '-'}</strong>
        </article>
      </div>
    </section>
  )
}

export default Profile
