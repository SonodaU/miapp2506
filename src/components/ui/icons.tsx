import { AlertCircle, CheckCircle, ThumbsDown } from 'lucide-react'

export const getEvaluationIcon = (icon: string) => {
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