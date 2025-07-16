import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { History } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import type { Conversation } from '@/types/analysis'

interface ConversationListProps {
  conversations: Conversation[]
}

export const ConversationList = ({ conversations }: ConversationListProps) => {
  const router = useRouter()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="h-5 w-5 mr-2" />
          履歴
        </CardTitle>
        {/* <CardDescription>
          過去に実行した分析結果を確認できます
        </CardDescription> */}
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
                      {formatDate(conversation.createdAt)}
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
  )
}