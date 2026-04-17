function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

function LeadCard({ lead, onClick, onDragStart, onDragEnd, isDragging }) {
  const hasAnalysis = Boolean(String(lead?.aiAnalysis || lead?.aiGap || '').trim() || lead?.lastAnalyzed)
  const analyzedLabel = hasAnalysis
    ? `AI analyzed ${formatRelativeTime(lead.lastAnalyzed) || 'recently'}`
    : 'AI not run'

  return (
    <article
      className={isDragging ? 'lead-card dragging' : 'lead-card'}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(lead._id)
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onClick(lead)
        }
      }}
    >
      <div className="lead-card-top">
        <div>
          <p className="lead-card-name">{lead.name}</p>
          <p className="lead-card-query">{lead.scrapeQuery || 'No query'}</p>
        </div>
        <div className="lead-card-badges">
          <span className={`status-pill status-${String(lead.status || 'new').toLowerCase()}`}>
            {String(lead.status || 'new').toUpperCase()}
          </span>
          <span className={hasAnalysis ? 'status-pill ai-status analyzed' : 'status-pill ai-status pending'}>
            {analyzedLabel}
          </span>
        </div>
      </div>

      <div className="lead-card-meta">
        <span>{lead.location || 'No location'}</span>
        <span>{lead.phone || 'Phone unavailable'}</span>
      </div>

      <div className="lead-card-footer">
        <span>{lead.email || 'No email'}</span>
        <span>{lead.website || 'No website'}</span>
      </div>
    </article>
  )
}

export default LeadCard
