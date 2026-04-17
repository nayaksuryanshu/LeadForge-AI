import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext.jsx'
import { leadStatuses } from '../constants/leadStatuses.js'

const LeadsContext = createContext(null)

export function LeadsProvider({ children }) {
  const { isAuthenticated, isBootstrapping, token, logout } = useAuth()
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [leadNotes, setLeadNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isEmailGenerating, setIsEmailGenerating] = useState(false)
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')

  const refreshLeads = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLeads([])
      setSelectedLead(null)
      setLeadNotes([])
      setError('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await api.get('/leads')
      setLeads(response.data?.leads || [])
    } catch (requestError) {
      // Never keep stale leads from a previous session when refresh fails.
      setLeads([])
      setSelectedLead(null)
      setLeadNotes([])

      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, token, logout])

  useEffect(() => {
    if (isBootstrapping) {
      return
    }

    if (!isAuthenticated || !token) {
      setLeads([])
      setSelectedLead(null)
      setLeadNotes([])
      setError('')
      setDetailError('')
      setIsLoading(false)
      return
    }

    refreshLeads()
  }, [refreshLeads, isAuthenticated, isBootstrapping, token])

  const openLead = useCallback(async (lead) => {
    const leadId = typeof lead === 'string' ? lead : lead?._id

    if (!leadId) {
      return
    }

    setIsDetailLoading(true)
    setDetailError('')

    try {
      const response = await api.get(`/leads/${leadId}`)
      setSelectedLead(response.data?.lead || null)
      setLeadNotes(response.data?.notes || [])
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setDetailError(requestError.message)
    } finally {
      setIsDetailLoading(false)
    }
  }, [logout])

  const closeLead = useCallback(() => {
    setSelectedLead(null)
    setLeadNotes([])
    setDetailError('')
  }, [])

  const updateLead = useCallback(
    async (leadId, updates) => {
      setIsSaving(true)
      setError('')
      setDetailError('')

      try {
        const response = await api.patch(`/leads/${leadId}`, updates)
        const updatedLead = response.data?.lead

        setLeads((currentLeads) =>
          currentLeads.map((lead) => (lead._id === leadId ? updatedLead : lead)),
        )

        setSelectedLead((currentLead) =>
          currentLead && currentLead._id === leadId ? updatedLead : currentLead,
        )

        await refreshLeads()

        return updatedLead
      } catch (requestError) {
        if (requestError.message.toLowerCase().includes('unauthorized')) {
          logout()
        }

        setError(requestError.message)
        throw requestError
      } finally {
        setIsSaving(false)
      }
    },
    [logout, refreshLeads],
  )

  const moveLead = useCallback((leadId, status) => updateLead(leadId, { status }), [updateLead])

  const deleteLead = useCallback(async (leadId) => {
    setIsDeleting(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.delete(`/leads/${leadId}`)

      setLeads((currentLeads) => currentLeads.filter((lead) => lead._id !== leadId))
      setSelectedLead((currentLead) => (currentLead && currentLead._id === leadId ? null : currentLead))

      if (selectedLead && selectedLead._id === leadId) {
        setLeadNotes([])
      }

      return response.data
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setError(requestError.message)
      throw requestError
    } finally {
      setIsDeleting(false)
    }
  }, [logout, selectedLead])

  const deleteLeadsByQuery = useCallback(async (scrapeQuery) => {
    const encodedQuery = encodeURIComponent(String(scrapeQuery || '').trim())

    setIsDeleting(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.delete(`/leads/query/${encodedQuery}`)

      setLeads((currentLeads) =>
        currentLeads.filter((lead) => String(lead.scrapeQuery || '').trim() !== String(scrapeQuery || '').trim()),
      )

      setSelectedLead((currentLead) => {
        if (!currentLead) {
          return currentLead
        }

        return String(currentLead.scrapeQuery || '').trim() === String(scrapeQuery || '').trim()
          ? null
          : currentLead
      })

      setLeadNotes((currentNotes) => (selectedLead && String(selectedLead.scrapeQuery || '').trim() === String(scrapeQuery || '').trim() ? [] : currentNotes))

      return response.data
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setError(requestError.message)
      throw requestError
    } finally {
      setIsDeleting(false)
    }
  }, [logout, selectedLead])

  const addNote = useCallback(async (leadId, note) => {
    setIsSaving(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.post(`/notes/${leadId}`, { note })
      const createdNote = response.data?.note

      setLeadNotes((currentNotes) => [createdNote, ...currentNotes])

      return createdNote
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setError(requestError.message)
      throw requestError
    } finally {
      setIsSaving(false)
    }
  }, [logout])

  const analyzeLead = useCallback(async (leadId) => {
    setIsAnalyzing(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.post(`/ai/analyze/${leadId}`)
      const updatedLead = response.data?.lead

      if (updatedLead) {
        setLeads((currentLeads) =>
          currentLeads.map((lead) => (lead._id === leadId ? updatedLead : lead)),
        )

        setSelectedLead((currentLead) =>
          currentLead && currentLead._id === leadId ? updatedLead : currentLead,
        )
      }

      return response.data
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setDetailError(requestError.message)
      throw requestError
    } finally {
      setIsAnalyzing(false)
    }
  }, [logout])

  const sendEmail = useCallback(async (leadId, payload = {}) => {
    setIsEmailSending(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.post(`/email/send-email/${leadId}`, payload)
      const data = response?.data

      if (!data || data.success !== true) {
        throw new Error(data?.message || 'Email API did not return success.')
      }

      return data
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setDetailError(requestError.message)
      throw requestError
    } finally {
      setIsEmailSending(false)
    }
  }, [logout])

  const generateEmail = useCallback(async (leadId, payload = {}) => {
    setIsEmailGenerating(true)
    setError('')
    setDetailError('')

    try {
      const response = await api.post(`/email/generate-email/${leadId}`, payload)
      const data = response?.data

      if (!data || data.success !== true) {
        throw new Error(data?.message || 'Generate email API did not return success.')
      }

      return data
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('unauthorized')) {
        logout()
      }

      setDetailError(requestError.message)
      throw requestError
    } finally {
      setIsEmailGenerating(false)
    }
  }, [logout])

  const groupedLeads = useMemo(() => {
    return leadStatuses.reduce((accumulator, status) => {
      accumulator[status] = leads.filter(
        (lead) => String(lead.status || 'new').toLowerCase() === status,
      )
      return accumulator
    }, {})
  }, [leads])

  const counts = useMemo(() => {
    return leadStatuses.reduce((accumulator, status) => {
      accumulator[status] = groupedLeads[status].length
      return accumulator
    }, {})
  }, [groupedLeads])

  const value = {
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
    updateLead,
    moveLead,
    deleteLead,
    deleteLeadsByQuery,
    addNote,
    analyzeLead,
    generateEmail,
    sendEmail,
    leadStatuses,
  }

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
}

export const useLeads = () => {
  const context = useContext(LeadsContext)

  if (!context) {
    throw new Error('useLeads must be used inside a LeadsProvider')
  }

  return context
}
