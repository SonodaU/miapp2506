import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Session } from 'next-auth'

interface AppLayoutProps {
  children: ReactNode
  session: Session
  title?: string
  actions?: ReactNode
}

export const AppLayout = ({ 
  children, 
  session, 
  title = '動機づけ面接SVツール',
  actions 
}: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            
            <div className="flex items-center space-x-4">
              {actions}
              
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}