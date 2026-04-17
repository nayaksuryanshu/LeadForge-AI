import { useEffect, useState } from 'react'
import AddNoteForm from './AddNoteForm.jsx'
import AIAnalyzeButton from './AIAnalyzeButton.jsx'
import EmailComposer from './EmailComposer.jsx'
import WebsitePreview from './WebsitePreview.jsx'
import AIInsightsPanel from './AIInsightsPanel.jsx'

function formatDate(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleString()
}

function formatRelativeTime(value) {
  if (!value) {
    return ''
  }

  const timestamp = new Date(value).getTime()
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

function LeadDetailModal({
  lead,
  notes,
  onClose,
  onSave,
  onAddNote,
  onDelete,
  onAnalyze,
  onGenerateEmail,
  onSendEmail,
  isSaving,
  isDeleting,
  isAnalyzing,
  isEmailGenerating,
  isEmailSending,
  isLoading,
  detailError,
}) {
  const [formState, setFormState] = useState({
    name: '',
    location: '',
    phone: '',
    email: '',
    website: '',
    status: 'new',
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [generatedEmail, setGeneratedEmail] = useState(null)

  useEffect(() => {
    if (!lead) {
      return
    }

    setFormState({
      name: lead.name || '',
      location: lead.location || '',
      phone: lead.phone || '',
      email: lead.email || '',
      website: lead.website || '',
      status: lead.status || 'new',
    })
    setSuccessMessage('')
    setAnalysisResult(null)
    setGeneratedEmail(null)
  }, [lead])

  useEffect(() => {
    if (!lead) {
      return undefined
    }

    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [lead])

  if (!lead) {
    return null
  }

  const handleSave = async (event) => {
    event.preventDefault()
    await onSave(lead._id, formState)
    setSuccessMessage('Lead updated successfully.')
    window.setTimeout(() => setSuccessMessage(''), 2400)
  }

  const handleAddNote = async (noteText) => {
    await onAddNote(lead._id, noteText)
    setSuccessMessage('Note added successfully.')
    window.setTimeout(() => setSuccessMessage(''), 2400)
  }

  const handleAnalyze = async () => {
    const response = await onAnalyze(lead._id)
    setAnalysisResult(response?.analysis || null)
    setSuccessMessage('AI analysis refreshed successfully.')
    window.setTimeout(() => setSuccessMessage(''), 2400)
  }

  const handleDelete = async () => {
    await onDelete(lead._id)
  }

  const handleGenerateEmail = async () => {
    const recipientEmail = String(formState.email || '').trim()
    if (!recipientEmail) {
      setSuccessMessage('Please enter an email address before generating.')
      window.setTimeout(() => setSuccessMessage(''), 2400)
      return
    }

    setSuccessMessage('Generating email draft...')

    try {
      const response = await onGenerateEmail(lead._id, {
        recipientEmail,
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Draft generation failed.')
      }

      setGeneratedEmail(response?.generatedEmail || null)
      const recipient = response?.recipientEmail || recipientEmail
      const trace = response?.requestId ? ` (request: ${response.requestId})` : ''
      setSuccessMessage(recipient ? `Draft generated for ${recipient}.${trace}` : `Draft generated successfully.${trace}`)
      window.setTimeout(() => setSuccessMessage(''), 2400)
    } catch (error) {
      setSuccessMessage(error?.message || 'Failed to generate email draft.')
      window.setTimeout(() => setSuccessMessage(''), 3200)
    }
  }

  const handleSendEmail = async () => {
    const recipientEmail = String(formState.email || '').trim()
    if (!recipientEmail) {
      setSuccessMessage('Please enter an email address before sending.')
      window.setTimeout(() => setSuccessMessage(''), 2400)
      return
    }

    if (!generatedEmail?.subject || !generatedEmail?.body) {
      setSuccessMessage('Generate email draft first, then send.')
      window.setTimeout(() => setSuccessMessage(''), 2400)
      return
    }

    setSuccessMessage('Sending email...')

    try {
      const response = await onSendEmail(lead._id, {
        recipientEmail,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        source: generatedEmail.source || 'client_draft',
      })

      if (!response?.success) {
        throw new Error(response?.message || 'Email request failed.')
      }

      if (String(response?.email?.status || '').toLowerCase() !== 'sent') {
        throw new Error(response?.email?.errorMessage || 'Email request completed, but delivery was not confirmed.')
      }

      const recipient = response?.email?.recipientEmail || recipientEmail
      const trace = response?.requestId ? ` (request: ${response.requestId})` : ''
      setSuccessMessage(recipient ? `Email sent to ${recipient}.${trace}` : `Email sent successfully.${trace}`)
      window.setTimeout(() => setSuccessMessage(''), 3200)
    } catch (error) {
      setSuccessMessage(error?.message || 'Failed to send email.')
      window.setTimeout(() => setSuccessMessage(''), 3200)
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="section-label">Lead details</p>
            <h3>{lead.name}</h3>
            <p className="section-copy">Query: {lead.scrapeQuery || 'Unknown'}</p>
          </div>
          <div className="modal-head-actions">
            <button className="query-chip danger-chip" type="button" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete lead'}
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close modal">
              ×
            </button>
          </div>
        </header>

        {isLoading ? <p className="empty-state">Loading lead details...</p> : null}
        {detailError ? <p className="empty-state">Error: {detailError}</p> : null}
        {successMessage ? <p className="success-banner">{successMessage}</p> : null}

        <form className="detail-grid" onSubmit={handleSave}>
          <label className="input-group">
            <span>Name</span>
            <input
              type="text"
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label className="input-group detail-span-2">
            <span>Location</span>
            <input
              type="text"
              value={formState.location}
              onChange={(event) => setFormState((current) => ({ ...current, location: event.target.value }))}
            />
          </label>

          <label className="input-group">
            <span>Phone</span>
            <input
              type="text"
              value={formState.phone}
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label className="input-group">
            <span>Email</span>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="input-group">
            <span>Website</span>
            <input
              type="text"
              value={formState.website}
              onChange={(event) => setFormState((current) => ({ ...current, website: event.target.value }))}
            />
          </label>

          <label className="input-group">
            <span>Status</span>
            <select
              value={formState.status}
              onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="lost">Lost</option>
            </select>
          </label>

          <button className="primary-button detail-save" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        <section className="ai-tools-grid">
          <WebsitePreview website={formState.website || lead.website} />

          <div className="ai-tools-panel">
            <AIAnalyzeButton
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              disabled={isLoading || isSaving}
            />

            <AIInsightsPanel
              lead={lead}
              analysisResult={analysisResult}
              isAnalyzing={isAnalyzing}
              error={detailError}
            />
          </div>
        </section>

        <EmailComposer
          lead={lead}
          recipientEmail={formState.email}
          draft={generatedEmail}
          onGenerate={handleGenerateEmail}
          onSend={handleSendEmail}
          isGenerating={isEmailGenerating}
          isSending={isEmailSending}
          statusMessage={successMessage}
        />

        <section className="notes-section">
          <div className="notes-section-head">
            <div>
              <p className="section-label">Communication log</p>
              <h4>Notes</h4>
            </div>
            <span className="kanban-column-count">{notes.length} entries</span>
          </div>

          <AddNoteForm onSubmit={handleAddNote} isSubmitting={isSaving} />

          <div className="notes-list">
            {notes.length === 0 ? (
              <p className="kanban-empty">No notes yet. Add the first follow-up.</p>
            ) : (
              notes.map((note) => (
                <article key={note._id} className="note-item">
                  <p>{note.note}</p>
                  <span title={formatDate(note.createdAt)}>{formatRelativeTime(note.createdAt)}</span>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default LeadDetailModal
