import { useCallback, useState } from 'react'

export default function useDragDrop(onMoveLead) {
  const [draggedLeadId, setDraggedLeadId] = useState(null)

  const handleDragStart = useCallback((leadId) => {
    setDraggedLeadId(leadId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedLeadId(null)
  }, [])

  const handleDrop = useCallback(
    async (status) => {
      if (!draggedLeadId || !onMoveLead) {
        return
      }

      await onMoveLead(draggedLeadId, status)
      setDraggedLeadId(null)
    },
    [draggedLeadId, onMoveLead],
  )

  return {
    draggedLeadId,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  }
}
