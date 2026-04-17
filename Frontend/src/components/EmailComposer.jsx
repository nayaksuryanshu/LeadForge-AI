import OutreachButton from './OutreachButton.jsx'

function EmailComposer({
  lead,
  recipientEmail,
  draft,
  onGenerate,
  onSend,
  isGenerating,
  isSending,
  statusMessage,
}) {
  const resolvedRecipient = String(recipientEmail || lead?.email || '').trim()
  const hasDraft = Boolean(String(draft?.subject || '').trim() && String(draft?.body || '').trim())

  return (
    <section className="panel outreach-panel email-composer-panel">
      <header className="panel-header">
        <div>
          <p className="section-label">Email composer</p>
          <h3>{lead ? `Ready for ${lead.name}` : 'Select a lead'}</h3>
          <p className="section-copy">
            Step 1: Generate draft. Step 2: Review and send.
          </p>
        </div>
      </header>

      {lead ? (
        <div className="email-preview-card">
          <div className="email-preview-meta">
            <span>To</span>
            <strong>{resolvedRecipient || 'No email available'}</strong>
          </div>
          <div className="email-preview-meta">
            <span>Subject</span>
            <strong>{draft?.subject || 'Click generate to create a subject'}</strong>
          </div>
          <div className="email-preview-body">
            <span>Body</span>
            <p>{draft?.body || 'The generated email will appear here before sending.'}</p>
          </div>
        </div>
      ) : (
        <p className="kanban-empty">Choose a lead to preview and send a personalized email.</p>
      )}

      {statusMessage ? <p className="section-copy">{statusMessage}</p> : null}

      <div className="outreach-inline-actions">
        <OutreachButton
          onClick={onGenerate}
          isWorking={isGenerating}
          disabled={!lead || !resolvedRecipient || isSending}
          label="Generate Draft"
          loadingLabel="Generating..."
        />
        <OutreachButton
          onClick={onSend}
          isWorking={isSending}
          disabled={!lead || !resolvedRecipient || !hasDraft || isGenerating}
          label="Send Email"
          loadingLabel="Sending..."
        />
      </div>
    </section>
  )
}

export default EmailComposer
