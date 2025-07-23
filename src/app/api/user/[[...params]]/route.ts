import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/error-handler'
import { z } from 'zod'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const apiKeySchema = z.object({
  apiKey: z.string().min(1, "APIキーを入力してください").max(200, "APIキーが長すぎます"),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { params?: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramsArray = params.params || []
    const [action] = paramsArray

    if (action === 'api-key') {
      // APIキー情報取得
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          openaiApiKey: true 
        }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json({
        hasApiKey: !!user.openaiApiKey,
        apiKeyPreview: user.openaiApiKey ? `sk-...${user.openaiApiKey.slice(-4)}` : null
      })
    }

    if (action === 'profile') {
      // ユーザープロファイル取得
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { 
          id: true, 
          email: true, 
          name: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      return NextResponse.json({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { params?: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const paramsArray = params.params || []
    const [action] = paramsArray

    if (action === 'api-key') {
      // APIキー更新
      const body = await request.json()
      console.log('Received body:', body)
      
      const { apiKey } = apiKeySchema.parse(body)
      console.log('Parsed API key:', apiKey ? 'Present' : 'Missing')

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { openaiApiKey: apiKey },
        select: { id: true, email: true, name: true }
      })

      console.log('User updated successfully:', updatedUser.id)

      return NextResponse.json({ 
        message: 'APIキーが正常に更新されました',
        user: updatedUser 
      })
    }

    if (action === 'profile') {
      // プロファイル更新
      const body = await request.json()
      const profileSchema = z.object({
        name: z.string().min(1).max(100).optional(),
      })

      const { name } = profileSchema.parse(body)

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
        select: { id: true, email: true, name: true }
      })

      return NextResponse.json({ 
        message: 'プロファイルが正常に更新されました',
        user: updatedUser 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('User API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'リクエストの形式が正しくありません', 
          details: error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      )
    }

    // Prismaエラーのより詳細な処理
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        )
      }
    }

    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: `更新に失敗しました: ${errorDetails.message}` },
      { status: errorDetails.status || 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { params?: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramsArray = params.params || []
    const [action] = paramsArray

    if (action === 'api-key') {
      // APIキー削除
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { openaiApiKey: null },
        select: { id: true, email: true, name: true }
      })

      return NextResponse.json({ 
        message: 'APIキーが正常に削除されました',
        user: updatedUser 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}