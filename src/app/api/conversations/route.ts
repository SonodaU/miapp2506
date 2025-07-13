import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { handleApiError, AppError } from '@/lib/error-handler'
import { sendAnalysisCompleteEmail } from '@/lib/email'
import { z } from 'zod'
import type { AnalysisResult, AnalysisApiResponse } from '@/types/analysis'

const conversationSchema = z.object({
  text: z.string().min(1).max(config.analysis.maxTextLength),
  targetBehavior: z.string().optional(),
})

async function analyzeConversation(text: string, targetBehavior?: string, apiKey?: string): Promise<AnalysisResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.pythonApi.timeout)

    const response = await fetch(`${config.pythonApi.url}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text,
        target_behavior: targetBehavior,
        api_key: apiKey // ユーザーのAPIキーを送信
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new AppError(
        `Python API returned ${response.status}`,
        'PYTHON_API_ERROR',
        response.status
      )
    }

    const data: AnalysisApiResponse = await response.json()
    
    // Python APIの結果をそのまま返す（評価軸統一済み）
    return {
      cct: data.cct || [],
      sst: data.sst || [],
      empathy: data.empathy || [],
      partnership: data.partnership || []
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError('Analysis timeout', 'ANALYSIS_TIMEOUT', 408)
    }
    throw error
  }
}

// 非同期で分析を処理する関数
async function processAnalysisAsync(
  conversationId: string,
  text: string,
  targetBehavior: string | undefined,
  apiKey: string,
  userEmail: string
) {
  try {
    // ステータスを処理中に更新
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'processing' }
    })

    // 分析を実行
    const analysis = await analyzeConversation(text, targetBehavior, apiKey)

    // 分析結果を保存
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        analysis: analysis as any,
        status: 'completed'
      }
    })

    // メール通知を送信
    const analysisUrl = `${process.env.NEXTAUTH_URL}/analysis/${conversationId}`
    await sendAnalysisCompleteEmail(userEmail, conversationId, analysisUrl)

    // メール送信済みフラグを更新
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { emailNotified: true }
    })

    console.log(`Analysis completed and email sent for conversation ${conversationId}`)
  } catch (error) {
    console.error(`Error processing analysis for conversation ${conversationId}:`, error)
    
    // エラーステータスに更新
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'failed' }
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        createdAt: true,
        analysis: true,
      }
    })

    return NextResponse.json(
      conversations.map(conv => ({
        ...conv,
        createdAt: conv.createdAt.toISOString(),
      }))
    )
  } catch (error) {
    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { text, targetBehavior } = conversationSchema.parse(body)

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        openaiApiKey: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ユーザーのAPIキーまたはデフォルトのAPIキーを使用
    const apiKey = user.openaiApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI APIキーが設定されていません。管理者にお問い合わせください。' 
      }, { status: 500 })
    }

    const textLength = text.trim().length
    const isLongText = textLength > 2000

    if (isLongText) {
      // 長いテキストの場合は非同期処理
      const conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          text,
          targetBehavior,
          analysis: {},
          status: 'pending',
          emailNotified: false,
        },
        select: {
          id: true,
          text: true,
          createdAt: true,
          analysis: true,
          status: true,
        }
      })

      // バックグラウンドで分析を実行
      processAnalysisAsync(conversation.id, text, targetBehavior, apiKey, user.email)

      return NextResponse.json(
        {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
        },
        { status: 202 } // Accepted
      )
    } else {
      // 短いテキストの場合は通常の同期処理
      const analysis = await analyzeConversation(text, targetBehavior, apiKey)

      const conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          text,
          targetBehavior,
          analysis: analysis as any,
          status: 'completed',
        },
        select: {
          id: true,
          text: true,
          createdAt: true,
          analysis: true,
        }
      })

      return NextResponse.json(
        {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
        },
        { status: 201 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}