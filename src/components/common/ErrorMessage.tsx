import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  error: string
  onRetry?: () => void
  onGoBack?: () => void
}

export const ErrorMessage = ({ error, onRetry, onGoBack }: ErrorMessageProps) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <div className="space-x-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            再試行
          </Button>
        )}
        {onGoBack && (
          <Button onClick={onGoBack}>
            戻る
          </Button>
        )}
      </div>
    </div>
  </div>
)