import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/error-handler'
import { z } from 'zod'

const apiKeySchema = z.object({
  apiKey: z.string().min(1, "APIキーを入力してください").max(200, "APIキーが長すぎます"),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received body:', body) // デバッグ用
    
    const { apiKey } = apiKeySchema.parse(body)
    console.log('Parsed API key:', apiKey ? 'Present' : 'Missing') // デバッグ用

    // APIキーを更新
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { openaiApiKey: apiKey },
      select: { id: true, email: true, name: true }
    })

    console.log('User updated successfully:', updatedUser.id) // デバッグ用

    return NextResponse.json({ 
      message: 'APIキーが正常に更新されました',
      user: updatedUser 
    })
  } catch (error) {
    console.error('API Key update error:', error) // デバッグ用
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'APIキーの形式が正しくありません', 
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
      { error: `APIキーの更新に失敗しました: ${errorDetails.message}` },
      { status: errorDetails.status || 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    console.log('Fetching API key info for user:', session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        openaiApiKey: true 
      }
    })

    console.log('User found:', user ? 'Yes' : 'No')

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const hasApiKey = !!user.openaiApiKey
    const apiKeyPreview = user.openaiApiKey ? `sk-...${user.openaiApiKey.slice(-4)}` : null
    
    console.log('API key status:', { hasApiKey, apiKeyPreview })

    return NextResponse.json({
      hasApiKey,
      apiKeyPreview
    })
  } catch (error) {
    console.error('GET API key error:', error)
    
    // フィールドが存在しない場合のエラーハンドリング
    if (error && typeof error === 'object' && 'message' in error) {
      if (error.message?.includes('openaiApiKey')) {
        return NextResponse.json({
          hasApiKey: false,
          apiKeyPreview: null,
          warning: 'データベースの更新が必要です'
        })
      }
    }
    
    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}