import { useEffect, useState } from 'react'

function EmailTemplateEditor({ template, onSave, isSaving }) {
  const [formState, setFormState] = useState({
    name: '',
    subject: '',
    body: '',
    description: '',
  })

  useEffect(() => {
    if (!template) {
      return
    }

    setFormState({
      name: template.name || '',
      subject: template.subject || '',
      body: template.body || '',
      description: template.description || '',
    })
  }, [template])

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onSave(formState)
  }

  return (
    <section className="panel outreach-panel">
      <header className="panel-header">
        <div>
          <p className="section-label">Template editor</p>
          <h3>Base outreach message</h3>
          <p className="section-copy">
            Customize the default email that AI personalizes before sending.
          </p>
        </div>
      </header>

      <form className="email-template-form" onSubmit={handleSubmit}>
        <label className="input-group">
          <span>Template name</span>
          <input
            type="text"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
          />
        </label>

        <label className="input-group">
          <span>Subject</span>
          <input
            type="text"
            value={formState.subject}
            onChange={(event) => setFormState((current) => ({ ...current, subject: event.target.value }))}
          />
        </label>

        <label className="input-group email-body-field">
          <span>Body</span>
          <textarea
            value={formState.body}
            onChange={(event) => setFormState((current) => ({ ...current, body: event.target.value }))}
            placeholder="Use placeholders like {{lead.name}} and {{analysis.summary}}"
          />
        </label>

        <label className="input-group email-description-field">
          <span>Description</span>
          <input
            type="text"
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving template...' : 'Save template'}
        </button>
      </form>
    </section>
  )
}

export default EmailTemplateEditor
