'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, MessageSquare, Send, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle } from 'lucide-react'

interface Conversation {
  id: string
  text: string
  createdAt: string
  analysis: {
    content: Array<{ statement: string; evaluation: string; icon: string }>
    emotion: Array<{ statement: string; evaluation: string; icon: string }>
    structure: Array<{ statement: string; evaluation: string; icon: string }>
    expression: Array<{ statement: string; evaluation: string; icon: string }>
  }
}

interface Chat {
  id: string
  aspect: string
  userQuestion: string
  aiResponse: string
  useReference: boolean
  createdAt: string
}

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedAspect, setSelectedAspect] = useState('')
  const [selectedStatement, setSelectedStatement] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [useReference, setUseReference] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data)
      }
    } catch (error) {
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

  const fetchChats = async (aspect: string) => {
    try {
      const response = await fetch(`/api/conversations/${params.id}/chat?aspect=${aspect}`)
      if (response.ok) {
        const data = await response.json()
        setChats(data)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const openDetailDialog = (aspect: string, statement: string) => {
    setSelectedAspect(aspect)
    setSelectedStatement(statement)
    setIsDialogOpen(true)
    fetchChats(aspect)
  }

  const sendQuestion = async () => {
    if (!question.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/conversations/${params.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aspect: selectedAspect,
          userQuestion: question,
          useReference,
        }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats([...chats, newChat])
        setQuestion('')
      }
    } catch (error) {
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
      case 'content':
        return 'Content（内容）'
      case 'emotion':
        return 'Emotion（感情）'
      case 'structure':
        return 'Structure（構造）'
      case 'expression':
        return 'Expression（表現）'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(conversation.analysis).map(([aspect, evaluations]) => (
            <Card key={aspect} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{getAspectTitle(aspect)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evaluations.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => openDetailDialog(aspect, item.statement)}
                  >
                    <div className="flex items-start space-x-2">
                      {getEvaluationIcon(item.icon)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.statement}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {item.evaluation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{getAspectTitle(selectedAspect)} - 詳細分析</DialogTitle>
            <DialogDescription>
              対象発言: {selectedStatement}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {chats.map((chat) => (
                  <div key={chat.id} className="space-y-2">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900">質問</p>
                      <p className="text-sm text-blue-800">{chat.userQuestion}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">AI回答</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {chat.aiResponse}
                      </p>
                    </div>
                    <Separator />
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