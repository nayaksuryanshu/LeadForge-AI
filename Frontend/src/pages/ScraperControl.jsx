import { useState } from 'react'
import api from '../services/api'

function ScraperControl() {
  const [query, setQuery] = useState('restaurants in Indore')
  const [results, setResults] = useState(20)
  const [useEnrichment, setUseEnrichment] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lastRun, setLastRun] = useState(null)
  const [error, setError] = useState('')

  const sampleLeads = lastRun?.leads || []
  const leadsWithPhones = sampleLeads.filter((lead) => String(lead.phone || '').trim()).length
  const leadsWithWebsites = sampleLeads.filter((lead) => String(lead.website || '').trim()).length
  const modeLabel = useEnrichment ? 'Deep enrichment' : 'Fast mode'

  const handleStart = async () => {
    setError('')
    setIsRunning(true)
    setProgress(20)

    try {
      const response = await api.post('/scraper/start', {
        query,
        maxResults: results,
        enrich: useEnrichment,
      }, {
        timeout: 180000,
      })

      setLastRun(response.data)

      if (response.data?.success === false) {
        setError(response.data?.message || 'Scraper could not complete this run.')
        setProgress(0)
      } else {
        setProgress(100)
      }
    } catch (requestError) {
      setError(requestError.message)
      setProgress(0)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="panel scraper-panel">
      <header className="panel-header">
        <div>
          <p className="section-label">Scraper control</p>
          <h2>Start or stop scraping runs</h2>
          <p className="section-copy">
            Configure a search query, choose the result count, and monitor progress
            in real time.
          </p>
        </div>
      </header>

      <div className="scraper-form">
        <label className="input-group">
          <span>Search query</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='e.g. "restaurants in Indore"'
          />
        </label>

        <label className="input-group">
          <span>Number of results</span>
          <input
            type="number"
            min="1"
            max="50"
            value={results}
            onChange={(event) => setResults(Number(event.target.value))}
          />
        </label>

        <div className="input-group">
          <span>Scrape mode</span>
          <div className="mode-toggle" role="group" aria-label="Scrape mode">
            <button
              type="button"
              className={useEnrichment ? 'mode-toggle-btn' : 'mode-toggle-btn active'}
              onClick={() => setUseEnrichment(false)}
            >
              Fast (recommended)
            </button>
            <button
              type="button"
              className={useEnrichment ? 'mode-toggle-btn active' : 'mode-toggle-btn'}
              onClick={() => setUseEnrichment(true)}
            >
              Deep enrichment
            </button>
          </div>
        </div>

        <section className="scraper-mode-hint" aria-label="Scrape mode details">
          <p className="section-label">Mode details</p>
          <h3>{modeLabel}</h3>
          <p className="section-copy">
            {useEnrichment
              ? 'Best for richer data quality. Slower because it checks additional details per lead.'
              : 'Best for speed. Captures leads quickly with base fields from search cards.'}
          </p>
        </section>

        <button className="primary-button" type="button" onClick={handleStart} disabled={isRunning}>
          {isRunning ? 'Scraping...' : 'Start Scraping'}
        </button>

        <p className="section-copy" role="status" aria-live="polite">
          Scraping can take time, especially in deep enrichment mode. Please wait on this page until the run finishes.
        </p>
      </div>

      <div className="progress-card">
        <div className="progress-copy">
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track" aria-label="Scraping progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="section-copy">
          {isRunning
            ? `Scraping ${results} leads for ${query} using ${useEnrichment ? 'deep enrichment' : 'fast'} mode.`
            : 'Ready to start a new scraping run.'}
        </p>

        <div className="scraper-stats-row">
          <article className="scraper-stat-chip">
            <span>Requested</span>
            <strong>{results}</strong>
          </article>
          <article className="scraper-stat-chip">
            <span>Mode</span>
            <strong>{useEnrichment ? 'Deep' : 'Fast'}</strong>
          </article>
          <article className="scraper-stat-chip">
            <span>Stored last run</span>
            <strong>{lastRun?.totalStored || 0}</strong>
          </article>
        </div>

        {error ? <p className="section-copy">Error: {error}</p> : null}
        {lastRun ? (
          <div className="scraper-results">
            <p className="section-copy">
              Stored {lastRun.totalStored} leads from query "{lastRun.query}".
            </p>
            <p className="section-copy">
              {leadsWithPhones} leads include a phone number and {leadsWithWebsites} include a website link.
            </p>

            {sampleLeads.length > 0 ? (
              <div className="table-shell scraper-table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Phone</th>
                      <th>Website</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleLeads.slice(0, 8).map((lead) => (
                      <tr key={`${lead._id}-${lead.name}`}>
                        <td>{lead.name}</td>
                        <td>{lead.phone || 'Not found'}</td>
                        <td>
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noreferrer">
                              Open site
                            </a>
                          ) : (
                            'Not found'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ScraperControl