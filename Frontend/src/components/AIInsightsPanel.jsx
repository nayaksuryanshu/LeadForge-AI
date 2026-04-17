import { useMemo, useState } from 'react'
import formatAIResponse from '../utils/formatAIResponse.js'

function buildPitchCopy(lead, formatted) {
  const businessName = lead?.name || 'this business'
  const summary = formatted.summary || 'I found a strong AI opportunity on your website.'
  const gap = formatted.aiGap || 'There is room to improve lead capture and follow-up.'
  const suggestion = formatted.suggestions[0] || 'We can help you convert more inbound traffic with AI.'

  return [
    `Hi ${businessName},`,
    '',
    summary,
    gap,
    suggestion,
    '',
    'If helpful, I can share a quick AI plan tailored to your business goals.',
    '',
    'Best,',
    'LeadForge AI',
  ].join('\n')
}

function AIInsightsPanel({ lead, analysisResult, isAnalyzing, error }) {
  const [copyState, setCopyState] = useState('idle')
  const analysisSpeciality = String(analysisResult?.context?.businessSpeciality || '').trim()

  const formatted = formatAIResponse({
    summary: analysisResult?.summary || lead?.aiAnalysis,
    aiGap: analysisResult?.aiGap || lead?.aiGap,
    suggestions: analysisResult?.suggestions,
    lastAnalyzed: lead?.lastAnalyzed,
  })

  const pitchCopy = useMemo(() => buildPitchCopy(lead, formatted), [formatted, lead])

  const handleCopyPitch = async () => {
    try {
      await navigator.clipboard.writeText(pitchCopy)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch (_copyError) {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  const canCopyPitch = Boolean(formatted.summary || formatted.aiGap || formatted.suggestions.length > 0)

  return (
    <section className="ai-insights-panel">
      <header className="ai-insights-head">
        <div>
          <p className="section-label">AI analysis</p>
          <h4>Opportunity breakdown</h4>
        </div>
        {formatted.lastAnalyzedLabel ? <span className="kanban-column-count">Last analyzed: {formatted.lastAnalyzedLabel}</span> : null}
      </header>

      {analysisSpeciality ? <p className="section-copy">Speciality lens: {analysisSpeciality}</p> : null}

      {isAnalyzing ? <p className="kanban-empty">Analyzing this lead website now...</p> : null}
      {error ? <p className="kanban-empty">Analysis error: {error}</p> : null}

      {!formatted.summary && !formatted.aiGap && !isAnalyzing ? (
        <p className="kanban-empty">Run AI analysis to generate a tailored outreach angle.</p>
      ) : null}

      {formatted.summary ? (
        <article className="ai-insight-block">
          <p className="section-label">Summary</p>
          <p>{formatted.summary}</p>
        </article>
      ) : null}

      {formatted.aiGap ? (
        <article className="ai-insight-block">
          <p className="section-label">Detected gap</p>
          <p>{formatted.aiGap}</p>
        </article>
      ) : null}

      {formatted.suggestions.length > 0 ? (
        <article className="ai-insight-block">
          <p className="section-label">Pitch suggestions</p>
          <ul>
            {formatted.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      ) : null}

      <button className="primary-button ai-copy-button" type="button" onClick={handleCopyPitch} disabled={!canCopyPitch}>
        {copyState === 'copied' ? 'Pitch copied' : copyState === 'error' ? 'Copy failed' : 'Copy pitch'}
      </button>
    </section>
  )
}

export default AIInsightsPanel
