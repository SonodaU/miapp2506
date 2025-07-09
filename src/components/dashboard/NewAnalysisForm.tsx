'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { MessageSquareIcon, Send, Loader2, Target, Crosshair, CrossIcon } from 'lucide-react'

interface NewAnalysisFormProps {
  onAnalyze: (text: string, targetBehavior: string) => Promise<void>
  isLoading: boolean
}

export const NewAnalysisForm = ({ onAnalyze, isLoading }: NewAnalysisFormProps) => {
  const [text, setText] = useState('')
  const [targetBehavior, setTargetBehavior] = useState('')

  const handleSubmit = async () => {
    if (!text.trim()) return
    await onAnalyze(text, targetBehavior)
    setText('')
    setTargetBehavior('')
  }

  const handleSampleText = () => {
    const sampleText = `セラピスト（T）：このところはどんな具合ですか。

クライアント（C）：……最近、外に出る気力がまったく湧かなくて。ずっと家にいて、何もしたくない感じです。

T：外に出ることにも、大きなエネルギーが必要に感じてしまう。

C：はい。出なきゃとは思うんですけど、身体が重いっていうか……動こうとすると、無理だって気持ちが先にきちゃいます。

T：それはつらい状態ですね。「無理だ」という気持ちが出てくるとき、どんなことを考えていますか？

C：どうせ行ったって楽しくないとか、何かあってもうまくやれないとか、そういうことばかり浮かんできて……。

T：なるほど。外出しようとするたびに、「楽しくない」「うまくやれない」といった考えが心に浮かんできて、それが気力を削いでしまうんですね。

C：そうです……。

T：今、そう感じるのは自然なことだと思いますよ。何かに挑戦しようとするとき、不安や否定的な思考が出てくるのはよくあることです。
でも、もし少しだけでも「やってもいいかな」と思えることがあるとしたら、どんなことが思い浮かびますか？

C：……コンビニに行くくらいなら、まあ……。

T：コンビニ、いいですね。それはよく行く場所ですか？

C：以前は……。最近は出るのも面倒で。でも、ほんの近所ですし。

T：それなら、まずは「何か買う」というより、「行って帰ってくることだけ」を目的にしてみてもいいかもしれませんね。成功体験を小さく設定することが、次の一歩の力になります。

C：成功体験……。

T：ええ。たとえば「玄関を出たらOK」「3分歩けたらOK」というふうに、基準を変えるんです。できなかったことじゃなく、「できたこと」に意識を向けてみる。それが、気力を引き出す第一歩になります。
    `

    setText(sampleText)
    setTargetBehavior('外出する頻度を増やす')
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
        <div className="space-y-3">
          <div>
            <label htmlFor="target-behavior" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Crosshair className="h-4 w-4 mr-1" />
              目標行動
            </label>
            <Input
              id="target-behavior"
              placeholder="リストカットを減らす"
              value={targetBehavior}
              onChange={(e) => setTargetBehavior(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="relative">
            
            <label htmlFor="conversation-text" className="text-sm font-medium text-gray-700 mb-2 block">
              会話テキスト
            </label>
            <Textarea
              id="conversation-text"
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