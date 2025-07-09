'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useConversations } from '@/hooks/useConversations'
import { useApiKeyManagement } from '@/hooks/useApiKeyManagement'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { AppLayout } from '@/components/layouts/AppLayout'
import { ApiKeyDialog } from '@/components/dashboard/ApiKeyDialog'
import { NewAnalysisForm } from '@/components/dashboard/NewAnalysisForm'
import { ConversationList } from '@/components/dashboard/ConversationList'

export default function DashboardPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    createConversation,
    clearError: clearConversationsError,
  } = useConversations()
  
  const {
    hasApiKey,
    apiKeyPreview,
    isLoading: apiKeyLoading,
    error: apiKeyError,
    updateApiKey,
    clearError: clearApiKeyError,
  } = useApiKeyManagement()

  const handleAnalyze = async (text: string, targetBehavior: string) => {
    try {
      const conversation = await createConversation(text, targetBehavior)
      router.push(`/analysis/${conversation.id}`)
    } catch (error) {
      // エラーは useConversations で処理される
    }
  }

  if (authLoading) {
    return <LoadingSpinner />
  }

  if (!session) {
    return null
  }

  const error = conversationsError || apiKeyError
  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => {
          clearConversationsError()
          clearApiKeyError()
        }}
        onGoBack={() => router.push('/auth/signin')}
      />
    )
  }

  return (
    <AppLayout 
      session={session}
      actions={
        <ApiKeyDialog
          hasApiKey={hasApiKey}
          apiKeyPreview={apiKeyPreview}
          isLoading={apiKeyLoading}
          onUpdateApiKey={updateApiKey}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - New Analysis */}
        <div className="space-y-6">
          <NewAnalysisForm 
            onAnalyze={handleAnalyze}
            isLoading={conversationsLoading}
          />
        </div>

        {/* Right Column - Recent Conversations */}
        <div className="space-y-6">
          <ConversationList conversations={conversations} />
        </div>
      </div>
    </AppLayout>
  )
}