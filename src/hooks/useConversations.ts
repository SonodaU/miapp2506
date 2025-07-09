'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import type { Conversation } from '@/types/analysis'

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiClient.getConversations()
      setConversations(data)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createConversation = async (text: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const conversation = await apiClient.createConversation(text)
      setConversations(prev => [conversation, ...prev])
      return conversation
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (id: string) => {
    setError(null)
    try {
      await apiClient.deleteConversation(id)
      setConversations(prev => prev.filter(conv => conv.id !== id))
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      throw error
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    deleteConversation,
    clearError: () => setError(null),
  }
}