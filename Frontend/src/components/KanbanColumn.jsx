import LeadCard from './LeadCard.jsx'

function KanbanColumn({
  title,
  status,
  leads,
  count,
  onLeadClick,
  onDragStart,
  onDragEnd,
  onDrop,
  isDropTarget,
  draggedLeadId,
  onDragEnter,
  onDragLeave,
}) {
  return (
    <section
      className={isDropTarget ? 'kanban-column drop-target' : 'kanban-column'}
      onDragEnter={onDragEnter}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onDragLeave()
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(status)
      }}
    >
      <header className="kanban-column-header">
        <div>
          <p className="kanban-column-title">{title}</p>
          <span className="kanban-column-count">{count} leads</span>
        </div>
        <span className="kanban-column-badge">{status}</span>
      </header>

      <div className="kanban-column-body">
        {leads.map((lead) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            onClick={onLeadClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedLeadId === lead._id}
          />
        ))}

        {leads.length === 0 ? <p className="kanban-empty">No leads in this column.</p> : null}
      </div>
    </section>
  )
}

export default KanbanColumn
