'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'

export const useApiKeyManagement = () => {
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchApiKeyInfo = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiClient.getApiKeyInfo()
      setHasApiKey(data.hasApiKey)
      setApiKeyPreview(data.apiKeyPreview)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateApiKey = async (apiKey: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await apiClient.updateApiKey(apiKey)
      await fetchApiKeyInfo()
      return true
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeyInfo()
  }, [])

  return {
    hasApiKey,
    apiKeyPreview,
    isLoading,
    error,
    updateApiKey,
    fetchApiKeyInfo,
    clearError: () => setError(null),
  }
}