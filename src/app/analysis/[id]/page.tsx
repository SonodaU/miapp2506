'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Send, AlertCircle, CheckCircle, ThumbsDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { apiClient } from '@/lib/api-client'
import { handleApiError } from '@/lib/error-handler'
import type { ConversationWithChats, Chat, EvaluationAxis } from '@/types/analysis'

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversation, setConversation] = useState<ConversationWithChats | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedAspect, setSelectedAspect] = useState<EvaluationAxis | ''>('')
  const [selectedStatement, setSelectedStatement] = useState<any>(null)
  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number>(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [useReference, setUseReference] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    try {
      const data = await apiClient.getConversation(params.id)
      setConversation(data)
      setChats(data.chats || [])
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error fetching conversation:', error)
    }
  }, [params.id])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session && params.id) {
      fetchConversation()
    }
  }, [session, params.id, fetchConversation])

  // 元の会話テキストから全発言を抽出して順番を保持する関数
  const parseAllStatements = (text: string): string[] => {
    // 改行で分割して空行を除去
    const lines = text.split('\n').filter(line => line.trim() !== '')
    return lines
  }

  // 各評価軸での全発言を統合したリストを作成
  const getAllStatements = () => {
    if (!conversation) return []
    
    const allStatements = parseAllStatements(conversation.text)
    const statementMap = new Map()
    
    // 各発言に基本情報を設定
    allStatements.forEach((statement, index) => {
      statementMap.set(index, {
        index,
        statement,
        evaluations: {} // 各評価軸の評価を格納
      })
    })
    
    // 各評価軸から評価を収集
    Object.entries(conversation.analysis).forEach(([aspect, evaluations]) => {
      if (Array.isArray(evaluations)) {
        evaluations.forEach((evaluation, evalIndex) => {
          const statement = evaluation.statement || evaluation.content
          if (statement) {
            // 発言を元テキストから探してインデックスを特定
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
    // チャットは既に全て取得済み（fetchConversationで取得）
    const aspectChats = chats.filter(chat => chat.aspect === aspect && chat.statementIndex === statementIndex)
    setChats(aspectChats)
  }

  const sendQuestion = async () => {
    if (!question.trim() || !selectedAspect) {
      return
    }

    setIsLoading(true)
    try {
      const newChat = await apiClient.sendChatMessage(
        params.id,
        selectedAspect,
        question,
        selectedStatementIndex,
        useReference
      )
      
      setChats([...chats, newChat])
      setQuestion('')
      
      // 新しいメッセージ追加後に最下部にスクロール
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
          if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight
          }
        }
      }, 100)
    } catch (error) {
      const errorDetails = handleApiError(error)
      setError(errorDetails.message)
      console.error('Error sending question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEvaluationIcon = (icon: string) => {
    switch (icon) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'bad':
        return <ThumbsDown className="h-4 w-4 text-red-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getAspectTitle = (aspect: string) => {
    switch (aspect) {
      case 'cct':
        return 'チェンジトーク促進'
      case 'sst':
        return '維持トーク限弱'
      case 'empathy':
        return '共感'
      case 'partnership':
        return 'パートナーシップ'
      default:
        return aspect
    }
  }

  const getAspectShortTitle = (aspect: string) => {
    switch (aspect) {
      case 'cct':
        return 'チェンジ\nトーク'
      case 'sst':
        return '維持トーク'
      case 'empathy':
        return '共感'
      case 'partnership':
        return 'パートナー\nシップ'
      default:
        return aspect
    }
  }

  if (status === 'loading' || !conversation) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (!session) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
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
              ダッシュボードに戻る
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">分析結果</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Original Text */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>分析対象テキスト</CardTitle>
            <CardDescription>
              {new Date(conversation.createdAt).toLocaleDateString('ja-JP')} に分析
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
        <Card>
          <CardHeader>
            <CardTitle>分析結果</CardTitle>
            <CardDescription>各評価軸での分析結果を確認できます。発言をクリックすると詳細を表示します。</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(conversation.analysis)[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                {Object.keys(conversation.analysis).map((aspect) => (
                  <TabsTrigger 
                    key={aspect} 
                    value={aspect} 
                    className="text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3 whitespace-pre-line text-center leading-tight h-auto min-h-[3rem]"
                  >
                    <span className="block">
                      {getAspectShortTitle(aspect)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.keys(conversation.analysis).map((aspect) => {
                const allStatements = getAllStatements()
                
                return (
                  <TabsContent key={aspect} value={aspect} className="mt-6">
                    <div className="space-y-4">
                      {allStatements.length > 0 ? (
                        allStatements.map((statementData, index) => {
                          const evaluation = statementData.evaluations[aspect]
                          const hasEvaluation = !!evaluation
                          
                          return (
                            <div
                              key={index}
                              className={`p-4 rounded-lg transition-colors border ${
                                hasEvaluation 
                                  ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer border-transparent hover:border-gray-200' 
                                  : 'bg-gray-25 border-gray-100 cursor-default'
                              }`}
                              onClick={() => hasEvaluation && openDetailDialog(aspect as EvaluationAxis, evaluation, index)}
                            >
                              <div className="flex items-start space-x-3">
                                {hasEvaluation ? (
                                  getEvaluationIcon(evaluation.icon || 'good')
                                ) : (
                                  <div className="h-4 w-4 rounded-full bg-gray-300 mt-0.5"></div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 mb-2">
                                    {statementData.statement}
                                  </p>
                                  {hasEvaluation && (
                                    <p className="text-sm text-gray-600">
                                      {evaluation.evaluation || evaluation.feedback || '評価が見つかりません'}
                                    </p>
                                  )}
                                  {!hasEvaluation && (
                                    <p className="text-xs text-gray-400 italic">
                                      この発言には評価がありません
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="p-6 text-center text-gray-500">
                          発言が見つかりません
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getAspectTitle(selectedAspect)} - 詳細分析</DialogTitle>
            <DialogDescription>
              選択した発言について詳しく質問できます
            </DialogDescription>
          </DialogHeader>
          
          {/* Selected Statement Display */}
          {selectedStatement && (
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
          )}
          
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 h-96 overflow-y-auto">
              <div className="space-y-4 pb-2">
                {chats.filter(chat => chat.aspect === selectedAspect && chat.statementIndex === selectedStatementIndex).map((chat, index) => (
                  <div key={chat.id} className="space-y-2">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">質問</p>
                      <p className="text-sm text-blue-800">{chat.userQuestion}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">AI回答</p>
                      <div className="text-sm text-gray-700 prose prose-sm max-w-none overflow-y-auto">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            h1: ({ children }) => <h1 className="text-base font-semibold mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-semibold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                            pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic mb-2">{children}</blockquote>
                          }}
                        >
                          {chat.aiResponse}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {index < chats.filter(c => c.aspect === selectedAspect && c.statementIndex === selectedStatementIndex).length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useReference"
                    checked={useReference}
                    onChange={(e) => setUseReference(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="useReference" className="text-sm text-gray-700">
                    文献参照を含める
                  </label>
                </div>
                
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="詳細な質問を入力してください..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1"
                    rows={3}
                  />
                  <Button
                    onClick={sendQuestion}
                    disabled={!question.trim() || isLoading}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}