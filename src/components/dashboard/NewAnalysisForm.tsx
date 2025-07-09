'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareIcon, Send, Loader2 } from 'lucide-react'

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

  const handleSampleText = () => {
    const sampleText = `今日はどういうことでいらっしゃいましたか？

最近、仕事でのストレスが大きくて、なかなか眠れない日が続いています。上司との関係も悪くて、毎日が憂鬱です。

そうですね。仕事でのストレスと睡眠の問題、そして上司との関係について話してくださったんですね。どのような感じでストレスを感じていらっしゃいますか？

毎朝会社に行くのが嫌で、胃が痛くなることも多いです。上司は私の意見を聞いてくれないし、いつも批判的で...。

胃の痛みまで感じられるほど、本当につらい状況なのですね。上司の方が批判的で、あなたの意見を聞いてもらえないというのは、大変な状況だと思います。

そうなんです。自分の価値を認めてもらえないような感じがして、自信もなくなってきました。

価値を認めてもらえないと感じる状況は、本当につらいですね。そのような環境の中で、あなたはどのように対処しようと努力されてきましたか？`

    setText(sampleText)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquareIcon className="h-5 w-5 mr-2" />
          新規分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="セラピスト: 今日はどういうことでいらっしゃいましたか？"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[300px] resize-none"
          />
          {!text.trim() && (
            <Button
              onClick={handleSampleText}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="absolute bottom-2 left-2 z-10"
            >
              サンプルテキストを入力
            </Button>
          )}
        </div>
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            className={`w-12 h-12 rounded-full transition-colors border-none flex items-center justify-center ${
              !text.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}