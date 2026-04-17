function formatSentAt(value) {
  if (!value) {
    return 'Just now'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return date.toLocaleString()
}

function SentEmailsLog({ emails, isLoading, error }) {
  return (
    <section className="panel outreach-panel">
      <header className="panel-header">
        <div>
          <p className="section-label">Sent emails</p>
          <h3>Outreach history</h3>
          <p className="section-copy">Track what was sent, to whom, and when.</p>
        </div>
      </header>

      {isLoading ? <p className="kanban-empty">Loading sent email log...</p> : null}
      {error ? <p className="kanban-empty">Error: {error}</p> : null}

      {!isLoading && emails.length === 0 ? (
        <p className="kanban-empty">No sent emails yet.</p>
      ) : null}

      <div className="sent-email-list">
        {emails.map((email) => (
          <article key={email._id} className="sent-email-item">
            <div className="sent-email-row">
              <strong>{email.subject}</strong>
              <span
                className={`status-pill status-${
                  email.status === 'sent' ? 'qualified' : email.status === 'failed' ? 'lost' : 'contacted'
                }`}
              >
                {String(email.status || 'pending').toUpperCase()}
              </span>
            </div>
            <p>{email.recipientEmail}</p>
            <span>{email.leadId?.name || 'Lead removed'}</span>
            <small>{formatSentAt(email.sentAt || email.createdAt)}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

export default SentEmailsLog
