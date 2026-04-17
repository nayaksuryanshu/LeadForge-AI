import { useMemo } from 'react'
import { useLeads } from '../context/LeadsContext.jsx'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

const getDateLabel = (value) => {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return dateFormatter.format(date)
}

function Dashboard() {
  const { leads, counts, isLoading, error } = useLeads()

  const stats = useMemo(() => {
    const totalLeads = leads.length
    const analyzedCount = leads.filter((lead) => lead.lastAnalyzed || lead.aiAnalysis).length
    const qualifiedCount = counts.qualified || 0
    const contactedCount = counts.contacted || 0

    return [
      {
        label: 'Total leads',
        value: totalLeads.toLocaleString(),
        detail: `${counts.new || 0} new`,
      },
      {
        label: 'Analyzed by AI',
        value: analyzedCount.toLocaleString(),
        detail: totalLeads > 0 ? `${Math.round((analyzedCount / totalLeads) * 100)}% coverage` : 'No leads yet',
      },
      {
        label: 'Qualified leads',
        value: qualifiedCount.toLocaleString(),
        detail: `${contactedCount.toLocaleString()} contacted`,
      },
    ]
  }, [leads, counts])

  const statusBreakdown = useMemo(
    () => [
      { label: 'New', value: counts.new || 0 },
      { label: 'Contacted', value: counts.contacted || 0 },
      { label: 'Qualified', value: counts.qualified || 0 },
      { label: 'Lost', value: counts.lost || 0 },
    ],
    [counts],
  )

  const recentLeads = useMemo(() => {
    return [...leads]
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
      .slice(0, 6)
  }, [leads])

  return (
    <section className="dashboard-grid">
      <header className="hero-card panel">
        <div>
          <p className="section-label">Dashboard</p>
          <h2>Lead operations center</h2>
          <p className="section-copy">
            Review real lead performance, prioritize outreach, and keep your team
            focused on the next high-value opportunity.
          </p>
        </div>
        <div className="hero-badge">
          <span>Pipeline health</span>
          <strong>{isLoading ? 'Syncing...' : error ? 'Needs review' : 'Stable'}</strong>
        </div>
      </header>

      <div className="stats-row">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
          </article>
        ))}
      </div>

      <section className="panel two-column">
        <div>
          <p className="section-label">Lead status</p>
          <h3>Current distribution</h3>
        </div>

        <div className="status-list">
          {statusBreakdown.map((item) => (
            <div className="status-item" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Recently captured</p>
            <h3>Latest leads</h3>
          </div>
          <p className="section-copy">
            Most recent entries in your workspace, sorted by creation time.
          </p>
        </div>

        {error ? <p className="empty-state">Could not load dashboard data: {error}</p> : null}

        {recentLeads.length === 0 && !isLoading ? (
          <p className="empty-state">No leads captured yet. Run a scraper job to populate this view.</p>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Captured</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr key={lead._id}>
                    <td>{lead.name || 'Untitled lead'}</td>
                    <td>{lead.location || 'Unknown'}</td>
                    <td>{lead.status || 'new'}</td>
                    <td>{getDateLabel(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

export default Dashboard