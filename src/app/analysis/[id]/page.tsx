'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorMessage } from '@/components/common/ErrorMessage'
import { AnalysisResults } from '@/components/analysis/AnalysisResults'
import { DetailDialog } from '@/components/analysis/DetailDialog'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import { formatDate } from '@/lib/utils/date'
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  // 質問例リスト
  const questionSuggestions = [
    "より良い発言をするには？",
    "MIスピリットを活かすための具体的な方法は？",
    "聞き返しの例は？",
    "この場面でのベストな対応方法は？",
    "共感を示すための具体的な表現は？",
    "発言例を教えて",
    "この発言が相手に与える影響は？",
    "信頼関係を築くための言い回しは？",
    "相手の気持ちを引き出す質問方法は？",
    "この発言の背景にある意図は？",
    "相手の感情に配慮した表現方法は？",
    "より効果的なコミュニケーション方法は？"
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
    setIsDialogOpen(true)
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
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div className="flex-1 flex justify-center mr-10">
              <h1 className="text-2xl font-bold text-gray-900 text-center">分析結果</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Original Text */}
        <Card className="mb-8">
          <CardHeader>
            <CardDescription>
              {formatDate(conversation.createdAt)} に分析
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {conversation.text}
              </pre>
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

      {/* Detail Dialog */}
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