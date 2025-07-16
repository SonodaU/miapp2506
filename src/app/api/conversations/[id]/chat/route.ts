import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { handleApiError } from '@/lib/error-handler'
import { z } from 'zod'
import type { EvaluationAxis } from '@/types/analysis'

const chatSchema = z.object({
  aspect: z.enum(['cct', 'sst', 'empathy', 'partnership']),
  question: z.string().min(1).max(1000),
  useReference: z.boolean().optional().default(false),
  statementIndex: z.number().int().min(0),
  statementContent: z.string().optional().default(''),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const aspect = searchParams.get('aspect')
    const statementIndex = searchParams.get('statementIndex')

    const whereClause: any = {
      conversation: {
        id: params.id,
        userId: session.user.id,
      }
    }

    if (aspect) {
      whereClause.aspect = aspect
    }
    
    if (statementIndex !== null) {
      whereClause.statementIndex = parseInt(statementIndex)
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: config.ui.maxChatHistory,
    })

    return NextResponse.json(
      chats.map(chat => ({
        ...chat,
        createdAt: chat.createdAt.toISOString(),
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Chat API - Request body:', JSON.stringify(body, null, 2))
    
    const { aspect, question, useReference, statementIndex, statementContent } = chatSchema.parse(body)
    console.log('Chat API - Parsed data:', { aspect, question, useReference, statementIndex, statementContent })

    // 会話が存在し、ユーザーが所有者であることを確認
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { openaiApiKey: true }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // ユーザーのAPIキーまたはデフォルトのAPIキーを使用
    const apiKey = conversation.user.openaiApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI APIキーが設定されていません。ダッシュボードでAPIキーを設定するか、管理者にお問い合わせください。' 
      }, { status: 500 })
    }

    // 既存のチャット履歴を取得（同じ評価軸かつ同じ発言）
    const existingChats = await prisma.chat.findMany({
      where: {
        conversationId: params.id,
        aspect,
        statementIndex,
      },
      orderBy: { createdAt: 'asc' },
      take: config.ui.maxChatHistory,
    })

    // AIレスポンスを生成
    console.log('Chat API - Generating AI response for statement:', statementContent)
    const aiResponse = await generateAIResponse(
      conversation,
      aspect as EvaluationAxis,
      question,
      existingChats,
      useReference,
      apiKey,
      statementIndex,
      statementContent
    )
    console.log('Chat API - AI response generated successfully')

    // チャットを保存
    const chat = await prisma.chat.create({
      data: {
        conversationId: params.id,
        aspect,
        statementIndex,
        userQuestion: question,
        aiResponse,
        useReference,
      },
    })

    return NextResponse.json({
      ...chat,
      createdAt: chat.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Chat API - Error occurred:', error)
    
    if (error instanceof z.ZodError) {
      console.error('Chat API - Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    const errorDetails = handleApiError(error)
    console.error('Chat API - Handled error:', errorDetails)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}

async function generateAIResponse(
  conversation: any,
  aspect: EvaluationAxis,
  userQuestion: string,
  existingChats: any[],
  useReference: boolean,
  apiKey?: string,
  statementIndex?: number,
  statementContent?: string
): Promise<string> {
  // チャット履歴を適切な形式に変換
  const chatHistory = existingChats.flatMap(chat => [
    { role: 'user', content: chat.userQuestion },
    { role: 'assistant', content: chat.aiResponse }
  ])

  try {
    // Python APIに送信するデータを構築
    const requestPayload = {
      conversation_text: conversation.text,
      analysis_result: conversation.analysis,
      aspect,
      user_question: userQuestion,
      chat_history: chatHistory,
      use_reference: useReference,
      api_key: apiKey,
      statement_index: statementIndex,
      statement_content: statementContent,
    };
    
    console.log('generateAIResponse - Sending to Python API:', {
      url: `${config.pythonApi.url}/detailed-chat`,
      payload: JSON.stringify(requestPayload, null, 2)
    });

    // タイムアウト設定付きでfetch実行
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.pythonApi.timeout)
    
    // 新しいdetailed-chatエンドポイントを使用してプロンプト管理を一元化
    const response = await fetch(`${config.pythonApi.url}/detailed-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Python API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`FastAPI detailed-chat request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('generateAIResponse - Python API response:', data)
    return data.response || 'エラーが発生しました。もう一度お試しください。'
  } catch (error) {
    console.error('generateAIResponse - Error occurred:', error)
    throw error
  }
}