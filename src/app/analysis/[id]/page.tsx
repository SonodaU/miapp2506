'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, ArrowRightToLine, Home, Send, TextSearch, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { AnalysisResults } from '@/components/analysis/AnalysisResults'
import { DetailDialog } from '@/components/analysis/DetailDialog'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import { formatDate } from '@/lib/utils/date'
import { getAspectTitle } from '@/lib/utils/evaluation'
import { getEvaluationIcon } from '@/components/ui/icons'
import ReactMarkdown from 'react-markdown'
import type { ConversationWithChats, Chat, EvaluationAxis } from '@/types/analysis'

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { session, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [conversation, setConversation] = useState<ConversationWithChats | null>(null)
  const [allChats, setAllChats] = useState<Chat[]>([])
  const [currentChats, setCurrentChats] = useState<Chat[]>([])
  const [selectedAspect, setSelectedAspect] = useState<EvaluationAxis | ''>('')
  const [selectedStatement, setSelectedStatement] = useState<any>(null)
  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number>(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDesktopSplitView, setIsDesktopSplitView] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [useReference, setUseReference] = useState(false)

  // 質問例リスト
  const questionSuggestions = [
    "より良い発言をするには？",
    "MIスピリットをよりよく実現させるには？",
    "聞き返しの例は？",
    "代替案を教えて",
    "どういう意味か説明して",
    "別の言い回しは？",
  ]

  // ランダムに2つの質問を選択する関数
  const getRandomQuestions = () => {
    const shuffled = [...questionSuggestions].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 2)
  }

  const fetchConversation = useCallback(async () => {
    try {
      const data = await apiClient.getConversation(params.id)
      setConversation(data)
      setAllChats(data.chats || [])
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error fetching conversation:', error)
    }
  }, [params.id])

  useEffect(() => {
    if (session && params.id) {
      fetchConversation()
    }
  }, [session, params.id, fetchConversation])

  // 元の会話テキストから全発言を抽出して順番を保持する関数
  const parseAllStatements = (text: string): string[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '')
    return lines
  }

  // 各評価軸での全発言を統合したリストを作成
  const getAllStatements = () => {
    if (!conversation) return []
    
    const allStatements = parseAllStatements(conversation.text)
    const statementMap = new Map()
    
    allStatements.forEach((statement, index) => {
      statementMap.set(index, {
        index,
        statement,
        evaluations: {}
      })
    })
    
    Object.entries(conversation.analysis).forEach(([aspect, evaluations]) => {
      if (Array.isArray(evaluations)) {
        evaluations.forEach((evaluation, evalIndex) => {
          const statement = evaluation.statement || evaluation.content
          if (statement) {
            const matchIndex = allStatements.findIndex(s => s.includes(statement.slice(0, 50)))
            if (matchIndex !== -1 && statementMap.has(matchIndex)) {
              const existing = statementMap.get(matchIndex)
              existing.evaluations[aspect] = evaluation
            }
          }
        })
      }
    })
    
    return Array.from(statementMap.values())
  }

  const openDetailDialog = (aspect: EvaluationAxis, statement: any, statementIndex: number) => {
    setSelectedAspect(aspect)
    setSelectedStatement(statement)
    setSelectedStatementIndex(statementIndex)
    
    // デスクトップの場合はスプリットビューを使用
    if (window.innerWidth >= 1024) {
      setIsDesktopSplitView(true)
    } else {
      setIsDialogOpen(true)
    }
    
    setSuggestedQuestions(getRandomQuestions())
    const aspectChats = allChats.filter(chat => chat.aspect === aspect && chat.statementIndex === statementIndex)
    setCurrentChats(aspectChats)
  }

  const sendQuestion = async (questionText: string, useRef: boolean) => {
    if (!questionText.trim() || !selectedAspect) {
      return
    }

    setIsLoading(true)
    try {
      const newChat = await apiClient.sendChatMessage(
        params.id,
        selectedAspect,
        questionText,
        selectedStatementIndex,
        useRef
      )
      
      setCurrentChats([...currentChats, newChat])
      setAllChats([...allChats, newChat])
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error sending question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendQuestion = async () => {
    if (!question.trim()) return
    
    await sendQuestion(question, useReference)
    setQuestion('')
  }

  const handleSuggestedQuestionClick = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion)
  }

  if (authLoading || !conversation) {
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
        onGoBack={() => router.push('/dashboard')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12">
            {!isDesktopSplitView && (
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="mr-4"
              >
                <Home className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg font-medium text-gray-900 text-center">分析結果</h1>
            </div>
            {isDesktopSplitView && (
              <Button
                variant="ghost"
                onClick={() => setIsDesktopSplitView(false)}
                className="ml-4 bg-gray-100 hover:bg-gray-300 transition-colors"
              >
                <ArrowRightToLine className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={`${isDesktopSplitView ? 'flex h-[calc(100vh-3rem)]' : ''}`}>
        {/* メインコンテンツ */}
        <div className={`${isDesktopSplitView ? 'w-1/2 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
          {/* Original Text */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg relative">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {conversation.text}
                </pre>
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  {formatDate(conversation.createdAt)} に分析
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <AnalysisResults
            analysis={conversation.analysis}
            onStatementClick={openDetailDialog}
            getAllStatements={getAllStatements}
            originalText={conversation.text}
            parseAllStatements={parseAllStatements}
          />
        </div>

        {/* デスクトップ用スプリットビュー詳細パネル */}
        {isDesktopSplitView && (
          <div className="w-1/2 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{selectedAspect && getAspectTitle(selectedAspect)} - 詳細分析</h2>
              <p className="text-sm text-gray-600">選択した発言について詳しく質問できます</p>
            </div>
            
            {/* Selected Statement Display */}
            {selectedStatement && (
              <div className="p-6 border-b border-gray-200">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    {getEvaluationIcon(selectedStatement.icon || 'good')}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {selectedStatement.statement || selectedStatement.content || '発言内容が見つかりません'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedStatement.evaluation || selectedStatement.feedback || '評価が見つかりません'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* チャット部分 */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                {currentChats.map((chat, index) => (
                  <div key={chat.id} className="space-y-2">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">{chat.userQuestion}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                        <ReactMarkdown>{chat.aiResponse}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 質問入力エリア */}
              <div className="border-t pt-4">
                <div className="space-y-3">
                  {suggestedQuestions.length > 0 && currentChats.length === 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {suggestedQuestions.map((suggestedQuestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestedQuestionClick(suggestedQuestion)}
                            className="text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors border border-gray-200"
                          >
                            {suggestedQuestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <Textarea
                      placeholder="質問を入力してください..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full pr-12"
                      rows={3}
                    />
                    <button
                      onClick={() => setUseReference(!useReference)}
                      className={`absolute bottom-2 left-2 px-2 py-1 rounded-xl transition-colors border-none flex items-center gap-1 ${
                        useReference 
                          ? 'text-blue-500 font-bold '
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <TextSearch className="h-4 w-4" />
                      <span className="text-xs">文献を検索</span>
                    </button>
                    <button
                      onClick={handleSendQuestion}
                      disabled={!question.trim() || isLoading}
                      className={`absolute bottom-2 right-2 w-8 h-8 rounded-full transition-colors border-none flex items-center justify-center ${
                        !question.trim() || isLoading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-600 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* モバイル用ダイアログ */}
      <DetailDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedAspect={selectedAspect}
        selectedStatement={selectedStatement}
        currentChats={currentChats}
        onSendQuestion={sendQuestion}
        isLoading={isLoading}
        suggestedQuestions={suggestedQuestions}
      />
    </div>
  )
}