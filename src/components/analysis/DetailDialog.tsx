'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send, TextSearch, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getEvaluationIcon } from '@/components/ui/icons'
import { getAspectTitle } from '../../lib/utils/evaluation'
import type { Chat, EvaluationAxis } from '@/types/analysis'

interface DetailDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedAspect: EvaluationAxis | ''
  selectedStatement: any
  currentChats: Chat[]
  onSendQuestion: (question: string, useReference: boolean) => Promise<void>
  isLoading: boolean
  suggestedQuestions: string[]
  conversationId: string
  onAddChat: (newChat: Chat) => void
}

export const DetailDialog = ({
  isOpen,
  onClose,
  selectedAspect,
  selectedStatement,
  currentChats,
  onSendQuestion,
  isLoading,
  suggestedQuestions,
  conversationId,
  onAddChat,
}: DetailDialogProps) => {
  const [question, setQuestion] = useState('')
  const [useReference, setUseReference] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleSendQuestion = async () => {
    if (!question.trim()) return
    
    await onSendQuestion(question, useReference)
    setQuestion('')
    
    // スクロールを最下部に移動
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }
      }
    }, 100)
  }

  const handleSuggestedQuestionClick = (suggestedQuestion: string) => {
    setQuestion(suggestedQuestion)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 overflow-y-auto">
          <div className="space-y-6 pb-2">
            <div>
              <DialogHeader>
                <DialogTitle>{getAspectTitle(selectedAspect)} - 詳細分析</DialogTitle>
                <DialogDescription>
                  選択した発言について詳しく質問できます
                </DialogDescription>
              </DialogHeader>
            </div>
            
            {/* Selected Statement Display */}
            {selectedStatement && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start space-x-3">
                  {getEvaluationIcon(selectedStatement.icon || 'good')}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      {selectedStatement.statement || selectedStatement.content || '発言内容が見つかりません'}
                    </p>
                    <div className="space-y-3">
                      {selectedStatement.evaluation && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">評価の根拠</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{__html: selectedStatement.evaluation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></p>
                        </div>
                      )}
                      {selectedStatement.feedback && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">フィードバック</p>
                          <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{__html: selectedStatement.feedback.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></p>
                        </div>
                      )}
                      {selectedStatement.suggestions && selectedStatement.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">改善提案</p>
                          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                            {selectedStatement.suggestions.map((suggestion: string, idx: number) => (
                              <li key={idx} dangerouslySetInnerHTML={{__html: suggestion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* {selectedStatement.score && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">スコア</p>
                          <p className="text-sm text-gray-700">{selectedStatement.score}/5</p>
                        </div>
                      )} */}
                      {!selectedStatement.evaluation && !selectedStatement.feedback && (
                        <p className="text-sm text-gray-500">評価が見つかりません</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Chat History */}
            <div className="space-y-4">
              {currentChats.map((chat, index) => (
                <div key={chat.id} className="space-y-2">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">{chat.userQuestion}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0">{children}</h3>,
                          h4: ({ children }) => <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h4>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto mb-3">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-3 py-1">{children}</blockquote>,
                          hr: ({ children }) => <hr className="border-t border-gray-300 my-6" />
                        }}
                      >
                        {chat.aiResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {index < currentChats.length - 1 && <Separator className="my-6" />}
                </div>
              ))}
              
            </div>

            {/* Question Input Area */}
            <div className="border-t pt-4">
              <div className="space-y-3">
                {/* おすすめの質問 - チャット履歴がない時だけ表示 */}
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
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        handleSendQuestion()
                      }
                    }}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}