import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useLeads } from '../context/LeadsContext.jsx'
import EmailTemplateEditor from '../components/EmailTemplateEditor.jsx'
import EmailComposer from '../components/EmailComposer.jsx'
import SentEmailsLog from '../components/SentEmailsLog.jsx'

function OutreachCampaign() {
  const { leads, refreshLeads, isLoading: isLeadsLoading, sendEmail, generateEmail } = useLeads()
  const [, setTemplates] = useState([])
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [sentEmails, setSentEmails] = useState([])
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [generatedEmail, setGeneratedEmail] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [templateError, setTemplateError] = useState('')
  const [logError, setLogError] = useState('')
  const [isTemplateSaving, setIsTemplateSaving] = useState(false)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLogLoading, setIsLogLoading] = useState(false)

  useEffect(() => {
    setGeneratedEmail(null)
  }, [selectedLeadId])

  useEffect(() => {
    refreshLeads()
  }, [refreshLeads])

  useEffect(() => {
    const loadCampaignData = async () => {
      setTemplateError('')
      setLogError('')
      setIsLogLoading(true)

      try {
        const [templateResponse, sentResponse] = await Promise.all([
          api.get('/email/templates'),
          api.get('/email/sent-emails'),
        ])

        const loadedTemplates = templateResponse.data?.templates || []
        const defaultTemplate = loadedTemplates.find((template) => template.isDefault) || loadedTemplates[0] || null

        setTemplates(loadedTemplates)
        setActiveTemplate(defaultTemplate)
        setSentEmails(sentResponse.data?.sentEmails || [])
      } catch (requestError) {
        setTemplateError(requestError.message)
        setLogError(requestError.message)
      } finally {
        setIsLogLoading(false)
      }
    }

    loadCampaignData()
  }, [])

  useEffect(() => {
    if (selectedLeadIds.length === 0 && leads.length > 0) {
      const firstSelectableLead = leads.find((lead) => String(lead.email || '').trim())
      if (firstSelectableLead) {
        setSelectedLeadId(firstSelectableLead._id)
      }
    }
  }, [leads, selectedLeadIds.length])

  const selectedLead = useMemo(
    () => leads.find((lead) => lead._id === selectedLeadId) || null,
    [leads, selectedLeadId],
  )

  const selectedLeads = useMemo(() => {
    return leads.filter((lead) => selectedLeadIds.includes(lead._id))
  }, [leads, selectedLeadIds])

  const handleToggleLead = (leadId) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId],
    )
    setSelectedLeadId(leadId)
  }

  const handleSelectAll = () => {
    const selectableIds = leads.filter((lead) => String(lead.email || '').trim()).map((lead) => lead._id)
    setSelectedLeadIds(selectableIds)
    setSelectedLeadId(selectableIds[0] || '')
  }

  const handleSaveTemplate = async (templateState) => {
    setIsTemplateSaving(true)
    setTemplateError('')

    try {
      const response = await api.put('/email/templates/default', {
        ...templateState,
        isDefault: true,
      })

      setActiveTemplate(response.data?.template || null)
      setTemplates((current) => {
        const nextTemplates = current.filter((template) => !template.isDefault)
        if (response.data?.template) {
          return [response.data.template, ...nextTemplates]
        }
        return nextTemplates
      })
      setStatusMessage('Template saved successfully.')
      window.setTimeout(() => setStatusMessage(''), 2200)
    } catch (requestError) {
      setTemplateError(requestError.message)
    } finally {
      setIsTemplateSaving(false)
    }
  }

  const handleGenerateDraft = async () => {
    if (!selectedLead || !selectedLead.email) {
      setStatusMessage('Select a lead with an email address.')
      return
    }

    setIsGeneratingDraft(true)
    setStatusMessage('Generating email draft...')

    try {
      const response = await generateEmail(selectedLead._id, {
        templateId: activeTemplate?._id,
      })

      setGeneratedEmail(response?.generatedEmail || null)
      setStatusMessage(`Draft generated for ${selectedLead.email}. Review and click Send Email.`)
      window.setTimeout(() => setStatusMessage(''), 2400)
    } catch (requestError) {
      setStatusMessage(requestError.message)
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleSendDraft = async () => {
    if (!selectedLead || !selectedLead.email) {
      setStatusMessage('Select a lead with an email address.')
      return
    }

    if (!generatedEmail?.subject || !generatedEmail?.body) {
      setStatusMessage('Generate a draft first, then send.')
      return
    }

    setIsSending(true)
    setStatusMessage('Sending email...')

    try {
      const response = await sendEmail(selectedLead._id, {
        templateId: activeTemplate?._id,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        source: generatedEmail.source || 'client_draft',
      })

      setSentEmails((current) =>
        [response?.email ? { ...response.email, leadId: response?.lead } : null, ...current].filter(Boolean),
      )

      if (response?.delivered === false) {
        setStatusMessage(response?.message || `Email prepared for ${selectedLead.email}, but delivery failed.`)
      } else {
        setStatusMessage(`Email sent to ${selectedLead.email}.`)
      }
      window.setTimeout(() => setStatusMessage(''), 2400)
    } catch (requestError) {
      setStatusMessage(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleSendSelected = async () => {
    const targets = selectedLeads.filter((lead) => lead.email)
    if (targets.length === 0) {
      setStatusMessage('Select at least one lead with an email address.')
      return
    }

    setIsSending(true)
    setStatusMessage(`Sending ${targets.length} emails...`)

    try {
      const results = []
      let failedDeliveries = 0

      for (const lead of targets) {
        const response = await sendEmail(lead._id, {
          templateId: activeTemplate?._id,
        })
        if (response?.generatedEmail) {
          setGeneratedEmail(response.generatedEmail)
        }
        if (response?.delivered === false) {
          failedDeliveries += 1
        }
        if (response?.email) {
          results.push(response.email)
        }
      }

      setSentEmails((current) =>
        [...results.map((email, index) => ({ ...email, leadId: targets[index] })), ...current].filter(Boolean),
      )
      if (failedDeliveries > 0) {
        setStatusMessage(`Completed ${results.length} emails with ${failedDeliveries} delivery failures. Check Sent Emails log.`)
      } else {
        setStatusMessage(`Sent ${results.length} emails successfully.`)
      }
      window.setTimeout(() => setStatusMessage(''), 2800)
    } catch (requestError) {
      setStatusMessage(requestError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="outreach-campaign-grid">
      <header className="panel outreach-hero">
        <div>
          <p className="section-label">Outreach campaign</p>
          <h2>Automated email generation and sending</h2>
          <p className="section-copy">
            Pick leads, personalize the base template, and send AI-written emails with one click.
          </p>
        </div>
        <div className="outreach-hero-actions">
          <button className="query-chip" type="button" onClick={handleSelectAll}>
            Select all with email
          </button>
          <button className="query-chip" type="button" onClick={handleSendSelected} disabled={isSending}>
            Send selected ({selectedLeadIds.length})
          </button>
        </div>
      </header>

      {statusMessage ? <p className="success-banner">{statusMessage}</p> : null}
      {templateError ? <p className="empty-state">Template error: {templateError}</p> : null}

      <div className="outreach-grid">
        <section className="panel outreach-panel outreach-lead-picker">
          <header className="panel-header">
            <div>
              <p className="section-label">Lead picker</p>
              <h3>Choose recipients</h3>
            </div>
          </header>

          {isLeadsLoading ? <p className="kanban-empty">Loading leads...</p> : null}
          <div className="outreach-lead-list">
            {leads.map((lead) => (
              <label key={lead._id} className="outreach-lead-item">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.includes(lead._id)}
                  onChange={() => handleToggleLead(lead._id)}
                  disabled={!String(lead.email || '').trim()}
                />
                <span>
                  <strong>{lead.name}</strong>
                  <small>{lead.email || 'No email available'}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="outreach-stack">
          <EmailTemplateEditor template={activeTemplate} onSave={handleSaveTemplate} isSaving={isTemplateSaving} />
          <EmailComposer
            lead={selectedLead}
            draft={generatedEmail}
            onGenerate={handleGenerateDraft}
            onSend={handleSendDraft}
            isGenerating={isGeneratingDraft}
            isSending={isSending}
            statusMessage={statusMessage}
          />
        </div>
      </div>

      <SentEmailsLog emails={sentEmails} isLoading={isLogLoading} error={logError} />
    </section>
  )
}

export default OutreachCampaign
