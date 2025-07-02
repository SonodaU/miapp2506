'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { PlusCircle, History, User, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface Conversation {
  id: string
  text: string
  createdAt: string
  analysis?: any
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [newText, setNewText] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchConversations()
    }
  }, [session])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!newText.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newText }),
      })

      if (response.ok) {
        const conversation = await response.json()
        router.push(`/analysis/${conversation.id}`)
      } else {
        console.error('Analysis failed')
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
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
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">会話分析・評価システム</h1>
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
                  <PlusCircle className="h-5 w-5 mr-2" />
                  新規分析
                </CardTitle>
                <CardDescription>
                  分析したい会話テキストを入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="例：
セラピスト: 今日はどのような気持ちでいらっしゃいましたか？
クライアント: 最近、仕事でのストレスが溜まっていて、なかなか眠れない日が続いています。
セラピスト: そうでしたか。それは辛い状況ですね。具体的にはどのようなことがストレスの原因になっているのでしょうか？
クライアント: 上司からの期待が高くて、プレッシャーを感じています。失敗したらどうしようという不安が頭から離れません。"
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
                              {new Date(conversation.createdAt).toLocaleDateString('ja-JP')}
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