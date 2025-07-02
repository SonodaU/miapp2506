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
    const { aspect, question, useReference, statementIndex } = chatSchema.parse(body)

    // 会話が存在し、ユーザーが所有者であることを確認
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
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
    const aiResponse = await generateAIResponse(
      conversation,
      aspect as EvaluationAxis,
      question,
      existingChats,
      useReference
    )

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

async function generateAIResponse(
  conversation: any,
  aspect: EvaluationAxis,
  userQuestion: string,
  existingChats: any[],
  useReference: boolean
): Promise<string> {
  // チャット履歴を適切な形式に変換
  const chatHistory = existingChats.flatMap(chat => [
    { role: 'user', content: chat.userQuestion },
    { role: 'assistant', content: chat.aiResponse }
  ])

  try {
    // 新しいdetailed-chatエンドポイントを使用してプロンプト管理を一元化
    const response = await fetch(`${config.pythonApi.url}/detailed-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_text: conversation.text,
        analysis_result: conversation.analysis,
        aspect,
        user_question: userQuestion,
        chat_history: chatHistory,
        use_reference: useReference,
      }),
    })

    if (!response.ok) {
      throw new Error(`FastAPI detailed-chat request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.response || 'エラーが発生しました。もう一度お試しください。'
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}