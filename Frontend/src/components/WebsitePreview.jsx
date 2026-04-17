import { useMemo, useState } from 'react'

function normalizeWebsiteUrl(url) {
  const value = String(url || '').trim()

  if (!value) {
    return ''
  }

  const candidate = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`

  try {
    const parsed = new URL(candidate)
    const protocol = parsed.protocol.toLowerCase()

    if (protocol !== 'http:' && protocol !== 'https:') {
      return ''
    }

    if (!parsed.hostname || !/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
      return ''
    }

    const host = parsed.hostname.toLowerCase()
    const isLocalhost = host === 'localhost'
    const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
    const hasPublicSuffix = host.includes('.')

    if (!isLocalhost && !isIpv4 && !hasPublicSuffix) {
      return ''
    }

    return parsed.toString()
  } catch {
    return ''
  }
}

function WebsitePreview({ website }) {
  const previewUrl = useMemo(() => normalizeWebsiteUrl(website), [website])
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false)

  if (!previewUrl) {
    return <p className="kanban-empty">No valid website URL available to preview.</p>
  }

  return (
    <div className="website-preview-shell">
      <p className="section-label">Website preview</p>
      <div className="website-preview-frame-wrap">
        {isPreviewLoaded ? (
          <iframe title="Lead website preview" src={previewUrl} className="website-preview-frame" loading="lazy" />
        ) : (
          <div className="website-preview-placeholder">
            <p className="section-copy">Preview is disabled by default to avoid noisy third-party page errors.</p>
            <button className="query-chip" type="button" onClick={() => setIsPreviewLoaded(true)}>
              Load preview
            </button>
          </div>
        )}
      </div>
      <a href={previewUrl} target="_blank" rel="noreferrer" className="website-preview-link">
        Open full website
      </a>
    </div>
  )
}

export default WebsitePreview
