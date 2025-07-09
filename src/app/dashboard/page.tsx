'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { MessageSquareIcon, History, User, LogOut, Key, Eye, EyeOff } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import { formatDate } from '@/lib/utils/date'
import type { Conversation } from '@/types/analysis'

export default function DashboardPage() {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [newText, setNewText] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false)
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchConversations()
      fetchApiKeyInfo()
    }
  }, [session])

  const fetchConversations = async () => {
    try {
      const data = await apiClient.getConversations()
      setConversations(data)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchApiKeyInfo = async () => {
    try {
      const data = await apiClient.getApiKeyInfo()
      setHasApiKey(data.hasApiKey)
      setApiKeyPreview(data.apiKeyPreview)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error fetching API key info:', error)
    }
  }

  const handleUpdateApiKey = async () => {
    if (!apiKey.trim()) {
      alert('APIキーを入力してください')
      return
    }
    
    setIsUpdatingApiKey(true)
    try {
      await apiClient.updateApiKey(apiKey.trim())
      setIsApiKeyDialogOpen(false)
      setApiKey('')
      setShowApiKey(false)
      await fetchApiKeyInfo()
      alert('APIキーが正常に更新されました')
    } catch (error) {
      const errorDetails = handleApiError(error)
      alert(errorDetails.message)
      console.error('Error updating API key:', error)
    } finally {
      setIsUpdatingApiKey(false)
    }
  }

  const handleAnalyze = async () => {
    if (!newText.trim()) return

    setIsLoading(true)
    try {
      const conversation = await apiClient.createConversation(newText)
      router.push(`/analysis/${conversation.id}`)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error analyzing conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading) {
    return <LoadingSpinner />
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => setError(null)}
        onGoBack={() => router.push('/auth/signin')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">動機づけ面接SVツール</h1>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {session.user?.name || session.user?.email}
                </span>
                <span className="text-xs text-gray-500">{session.user?.email}</span>
              </div>
              <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Key className="h-4 w-4 mr-2" />
                    {hasApiKey ? 'APIキー設定済' : 'デフォルト使用中'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>OpenAI APIキー設定</DialogTitle>
                    <DialogDescription>
                      独自のOpenAI APIキーを設定できます。設定しない場合はデフォルトのAPIキーが使用されます。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {hasApiKey ? (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <Key className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          現在のAPIキー: {apiKeyPreview}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                        <Key className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          現在: デフォルトAPIキーを使用中
                        </span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="api-key" className="text-sm font-medium">
                        APIキー
                      </label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsApiKeyDialogOpen(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleUpdateApiKey}
                        disabled={!apiKey.trim() || isUpdatingApiKey}
                      >
                        {isUpdatingApiKey ? '更新中...' : '更新'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - New Analysis */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquareIcon className="h-5 w-5 mr-2" />
                  新規分析
                </CardTitle>
                <CardDescription>
                  分析したい会話テキストを入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="セラピスト: 今日はどういうことでいらっしゃいましたか？"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="min-h-[300px] resize-none"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!newText.trim() || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? '分析中...' : '分析開始'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Conversations */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  最近の分析履歴
                </CardTitle>
                <CardDescription>
                  過去に実行した分析結果を確認できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    まだ分析履歴がありません
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((conversation, index) => (
                      <div key={conversation.id}>
                        <div
                          className="p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/analysis/${conversation.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              分析 #{conversations.length - index}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(conversation.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {conversation.text.slice(0, 100)}...
                          </p>
                        </div>
                        {index < conversations.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}