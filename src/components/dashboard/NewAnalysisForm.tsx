'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareIcon } from 'lucide-react'

interface NewAnalysisFormProps {
  onAnalyze: (text: string) => Promise<void>
  isLoading: boolean
}

export const NewAnalysisForm = ({ onAnalyze, isLoading }: NewAnalysisFormProps) => {
  const [text, setText] = useState('')

  const handleSubmit = async () => {
    if (!text.trim()) return
    await onAnalyze(text)
    setText('')
  }

  return (
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[300px] resize-none"
        />
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? '分析中...' : '分析開始'}
        </Button>
      </CardContent>
    </Card>
  )
}