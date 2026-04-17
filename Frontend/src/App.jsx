import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import LeadsList from './components/LeadsList.jsx'
import ScraperControl from './pages/ScraperControl.jsx'
import OutreachCampaign from './pages/OutreachCampaign.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Unauthorized from './pages/Unauthorized.jsx'
import { useAuth } from './context/AuthContext.jsx'
import './App.css'

const roleNavigation = {
  admin: [
    { to: '/', label: 'Dashboard' },
    { to: '/leads', label: 'Leads List' },
    { to: '/scraper', label: 'Scraper Control' },
    { to: '/outreach', label: 'Outreach Campaign' },
    { to: '/profile', label: 'My Profile' },
  ],
  manager: [
    { to: '/', label: 'Dashboard' },
    { to: '/leads', label: 'Leads List' },
    { to: '/scraper', label: 'Scraper Control' },
    { to: '/outreach', label: 'Outreach Campaign' },
    { to: '/profile', label: 'My Profile' },
  ],
  user: [
    { to: '/', label: 'Dashboard' },
    { to: '/leads', label: 'Leads List' },
    { to: '/scraper', label: 'Scraper Control' },
    { to: '/outreach', label: 'Outreach Campaign' },
    { to: '/profile', label: 'My Profile' },
  ],
}

const footerByRole = {
  admin: 'Admin view: full operational control enabled.',
  manager: 'Manager view: scraping and lead review enabled.',
  user: 'User view: profile, scraper, and leads access enabled.',
}

function RequireAuth({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <h2>Loading your session...</h2>
        </section>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function RequireRole({ children, roles }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, isBootstrapping, user, logout } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="auth-shell">
        <section className="auth-card">
          <h2>Loading your workspace...</h2>
        </section>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-shell">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  const navItems = roleNavigation[user?.role] || roleNavigation.user

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <p className="brand-kicker">LeadForge AI</p>
          <h1 className="brand-title">Lead intelligence workspace</h1>
          <p className="brand-copy">
            Capture, qualify, and review scraped business leads in one place.
          </p>

          <nav className="sidebar-nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}

            <button className="nav-link nav-button" type="button" onClick={logout}>
              Logout
            </button>
          </nav>
        </div>

        <div className="sidebar-meta" aria-label="System status">
          <p>Sync status</p>
          <strong>Signed in as {user?.name}</strong>
          <span>Role: {user?.role}</span>
        </div>
      </aside>

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route
            path="/leads"
            element={
              <RequireAuth>
                <RequireRole roles={['admin', 'manager', 'user']}>
                  <LeadsList />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/scraper"
            element={
              <RequireAuth>
                <RequireRole roles={['admin', 'manager', 'user']}>
                  <ScraperControl />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/outreach"
            element={
              <RequireAuth>
                <RequireRole roles={['admin', 'manager', 'user']}>
                  <OutreachCampaign />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <RequireAuth>
                <Unauthorized />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="app-footer">
          <span>{footerByRole[user?.role] || footerByRole.user}</span>
          <strong>{user?.email}</strong>
        </footer>
      </main>
    </div>
  )
}

export default App