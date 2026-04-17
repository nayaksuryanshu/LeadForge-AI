function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="confirm-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Confirm action'}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="section-label">Confirm action</p>
        <h3>{title}</h3>
        <p className="section-copy">{message}</p>

        <div className="confirm-modal-actions">
          <button className="query-chip" type="button" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button className="query-chip danger-chip" type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmActionModal
