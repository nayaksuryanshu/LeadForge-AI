import { useMemo } from 'react'
import { useState } from 'react'
import { useLeads } from '../context/LeadsContext.jsx'
import { leadStatuses } from '../constants/leadStatuses.js'
import useDragDrop from '../hooks/useDragDrop.js'
import KanbanColumn from './KanbanColumn.jsx'
import LeadDetailModal from './LeadDetailModal.jsx'
import ConfirmActionModal from './ConfirmActionModal.jsx'
import '../styles/kanban.css'

const statusLabels = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  lost: 'Lost',
}

const statusDescriptions = {
  new: 'Freshly scraped leads waiting for first review.',
  contacted: 'Leads that already received outreach.',
  qualified: 'Leads that look ready for follow-up.',
  lost: 'Dead ends, duplicates, or unfit prospects.',
}

function KanbanBoard() {
  const {
    leads,
    groupedLeads,
    counts,
    selectedLead,
    leadNotes,
    isLoading,
    isDetailLoading,
    isSaving,
    isDeleting,
    isAnalyzing,
    isEmailGenerating,
    isEmailSending,
    error,
    detailError,
    refreshLeads,
    openLead,
    closeLead,
    moveLead,
    updateLead,
    deleteLead,
    deleteLeadsByQuery,
    addNote,
    analyzeLead,
    generateEmail,
    sendEmail,
  } = useLeads()

  const { draggedLeadId, handleDragStart, handleDragEnd, handleDrop } = useDragDrop(moveLead)
  const [activeDropStatus, setActiveDropStatus] = useState('')
  const [selectedScrapeQuery, setSelectedScrapeQuery] = useState('')
  const [searchText, setSearchText] = useState('')
  const [deleteDialog, setDeleteDialog] = useState(null)

  const availableQueries = useMemo(() => {
    const unique = new Set(
      leads.map((lead) => String(lead.scrapeQuery || '').trim()).filter(Boolean),
    )

    return Array.from(unique).sort((a, b) => b.localeCompare(a))
  }, [leads])

  const queryCounts = useMemo(() => {
    const countsByQuery = {}

    for (const lead of leads) {
      const key = String(lead.scrapeQuery || '').trim()
      if (!key) {
        continue
      }

      countsByQuery[key] = (countsByQuery[key] || 0) + 1
    }

    return countsByQuery
  }, [leads])

  const filteredGroupedLeads = useMemo(() => {
    const normalizedSearchText = searchText.trim().toLowerCase()

    const visibleLeads = leads.filter((lead) => {
      if (selectedScrapeQuery && lead.scrapeQuery !== selectedScrapeQuery) {
        return false
      }

      if (!normalizedSearchText) {
        return true
      }

      return [lead.name, lead.scrapeQuery, lead.location, lead.phone, lead.email, lead.website]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearchText)
    })

    if (!selectedScrapeQuery) {
      return leadStatuses.reduce((accumulator, status) => {
        accumulator[status] = visibleLeads.filter(
          (lead) => String(lead.status || 'new').toLowerCase() === status,
        )
        return accumulator
      }, {})
    }

    return leadStatuses.reduce((accumulator, status) => {
      accumulator[status] = visibleLeads.filter(
        (lead) => String(lead.status || 'new').toLowerCase() === status,
      )
      return accumulator
    }, {})
  }, [leads, searchText, selectedScrapeQuery])

  const filteredCounts = useMemo(() => {
    return leadStatuses.reduce((accumulator, status) => {
      accumulator[status] = (filteredGroupedLeads[status] || []).length
      return accumulator
    }, {})
  }, [filteredGroupedLeads])

  const handleColumnDrop = async (status) => {
    await handleDrop(status)
    setActiveDropStatus('')
  }

  const handleCardDragEnd = () => {
    handleDragEnd()
    setActiveDropStatus('')
  }

  const summary = useMemo(() => {
    return leadStatuses.map((status) => ({
      status,
      label: statusLabels[status],
      count: filteredCounts[status] || 0,
    }))
  }, [filteredCounts])

  const handleDeleteLead = async (leadId) => {
    setDeleteDialog({
      type: 'lead',
      leadId,
      title: 'Delete this lead?',
      message: 'This will permanently remove the lead, notes, and sent email history for this lead.',
      confirmLabel: 'Delete lead',
    })
  }

  const handleDeleteSelectedQuery = async () => {
    if (!selectedScrapeQuery) {
      return
    }

    setDeleteDialog({
      type: 'query',
      scrapeQuery: selectedScrapeQuery,
      title: 'Delete all leads in this query?',
      message: `This will permanently remove every lead under "${selectedScrapeQuery}" with related notes and sent email logs.`,
      confirmLabel: 'Delete query leads',
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog) {
      return
    }

    if (deleteDialog.type === 'lead') {
      await deleteLead(deleteDialog.leadId)
      closeLead()
      setDeleteDialog(null)
      return
    }

    if (deleteDialog.type === 'query') {
      await deleteLeadsByQuery(deleteDialog.scrapeQuery)
      setSelectedScrapeQuery('')
      closeLead()
      setDeleteDialog(null)
    }
  }

  return (
    <section className="kanban-shell">
      <header className="kanban-hero panel">
        <div>
          <p className="section-label">CRM</p>
          <h2>Lead Kanban Board</h2>
          <p className="section-copy">
            Drag leads across columns, open details, edit lead data, and track every note.
          </p>
        </div>

        <div className="kanban-actions kanban-search-actions">
          <label className="input-group kanban-search-group">
            <span>Search leads</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search name, phone, email, location..."
            />
          </label>

          <button className="query-chip" type="button" onClick={refreshLeads}>
            Refresh board
          </button>

          <button className="query-chip" type="button" onClick={() => setSearchText('')}>
            Clear search
          </button>

          <button
            className="query-chip danger-chip"
            type="button"
            onClick={handleDeleteSelectedQuery}
            disabled={!selectedScrapeQuery || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete selected query'}
          </button>
        </div>
      </header>

      <div className="query-list kanban-query-list" role="list" aria-label="Scrape queries">
        <button
          type="button"
          className={selectedScrapeQuery ? 'query-chip' : 'query-chip active'}
          onClick={() => setSelectedScrapeQuery('')}
        >
          All queries
          <span className="query-chip-count">{leads.length}</span>
        </button>
        {availableQueries.map((scrapedQuery) => (
          <button
            type="button"
            role="listitem"
            key={scrapedQuery}
            className={selectedScrapeQuery === scrapedQuery ? 'query-chip active' : 'query-chip'}
            onClick={() => setSelectedScrapeQuery(scrapedQuery)}
          >
            {scrapedQuery}
            <span className="query-chip-count">{queryCounts[scrapedQuery] || 0}</span>
          </button>
        ))}
      </div>

      <p className="section-copy query-summary">
        {selectedScrapeQuery
          ? `Showing ${leads.filter((lead) => lead.scrapeQuery === selectedScrapeQuery).filter((lead) => {
              const normalizedSearchText = searchText.trim().toLowerCase()
              if (!normalizedSearchText) {
                return true
              }

              return [lead.name, lead.scrapeQuery, lead.location, lead.phone, lead.email, lead.website]
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearchText)
            }).length} leads for query: "${selectedScrapeQuery}"`
          : `Showing ${leads.filter((lead) => {
              const normalizedSearchText = searchText.trim().toLowerCase()
              if (!normalizedSearchText) {
                return true
              }

              return [lead.name, lead.scrapeQuery, lead.location, lead.phone, lead.email, lead.website]
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearchText)
            }).length} leads across all queries`}
      </p>

      <div className="kanban-summary">
        {summary.map((item) => (
          <article key={item.status} className="summary-card">
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <p>{statusDescriptions[item.status]}</p>
          </article>
        ))}
      </div>

      {error ? <p className="empty-state">Error: {error}</p> : null}
      {isLoading ? <p className="empty-state">Loading board...</p> : null}

      <div className="kanban-board">
        {leadStatuses.map((status) => (
          <KanbanColumn
            key={status}
            title={statusLabels[status]}
            status={status}
            leads={filteredGroupedLeads[status] || []}
            count={filteredCounts[status] || 0}
            onLeadClick={openLead}
            onDragStart={handleDragStart}
            onDragEnd={handleCardDragEnd}
            onDrop={handleColumnDrop}
            isDropTarget={activeDropStatus === status}
            draggedLeadId={draggedLeadId}
            onDragEnter={() => setActiveDropStatus(status)}
            onDragLeave={() => setActiveDropStatus((current) => (current === status ? '' : current))}
          />
        ))}
      </div>

      <LeadDetailModal
        lead={selectedLead}
        notes={leadNotes}
        onClose={closeLead}
        onSave={updateLead}
        onAddNote={addNote}
        onDelete={handleDeleteLead}
        onAnalyze={analyzeLead}
        onGenerateEmail={generateEmail}
        onSendEmail={sendEmail}
        isSaving={isSaving}
        isDeleting={isDeleting}
        isAnalyzing={isAnalyzing}
        isEmailGenerating={isEmailGenerating}
        isEmailSending={isEmailSending}
        isLoading={isDetailLoading}
        detailError={detailError}
      />

      <ConfirmActionModal
        isOpen={Boolean(deleteDialog)}
        title={deleteDialog?.title || ''}
        message={deleteDialog?.message || ''}
        confirmLabel={deleteDialog?.confirmLabel || 'Delete'}
        isSubmitting={isDeleting}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

export default KanbanBoard
