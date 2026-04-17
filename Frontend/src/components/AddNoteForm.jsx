import { useState } from 'react'

function AddNoteForm({ onSubmit, isSubmitting }) {
  const [note, setNote] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedNote = note.trim()
    if (!trimmedNote) {
      return
    }

    await onSubmit(trimmedNote)
    setNote('')
  }

  return (
    <form className="note-form" onSubmit={handleSubmit}>
      <label className="input-group note-input-group">
        <span>Add note</span>
        <textarea
          rows="4"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Write a follow-up, call outcome, or next step..."
        />
      </label>

      <button className="primary-button note-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save note'}
      </button>
    </form>
  )
}

export default AddNoteForm
