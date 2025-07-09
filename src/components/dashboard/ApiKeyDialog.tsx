'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Key, Eye, EyeOff } from 'lucide-react'

interface ApiKeyDialogProps {
  hasApiKey: boolean
  apiKeyPreview: string | null
  isLoading: boolean
  onUpdateApiKey: (apiKey: string) => Promise<void>
}

export const ApiKeyDialog = ({
  hasApiKey,
  apiKeyPreview,
  isLoading,
  onUpdateApiKey,
}: ApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      alert('APIキーを入力してください')
      return
    }

    try {
      await onUpdateApiKey(apiKey.trim())
      setIsOpen(false)
      setApiKey('')
      setShowApiKey(false)
      alert('APIキーが正常に更新されました')
    } catch (error) {
      // エラーは親コンポーネントで処理される
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              onClick={() => setIsOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!apiKey.trim() || isLoading}
            >
              {isLoading ? '更新中...' : '更新'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}