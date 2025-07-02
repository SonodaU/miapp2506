import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OpenAI } from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const chatSchema = z.object({
  aspect: z.string(),
  statementIndex: z.number().int().min(0),
  userQuestion: z.string().min(1),
  useReference: z.boolean().optional().default(false),
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
    const statementIndexParam = searchParams.get('statementIndex')

    const whereClause: any = {
      conversation: {
        id: params.id,
        userId: session.user.id,
      }
    }

    if (aspect) {
      whereClause.aspect = aspect
    }

    if (statementIndexParam) {
      whereClause.statementIndex = parseInt(statementIndexParam)
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        aspect: true,
        statementIndex: true,
        userQuestion: true,
        aiResponse: true,
        useReference: true,
        createdAt: true,
      }
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
    const { aspect, statementIndex, userQuestion, useReference } = chatSchema.parse(body)

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

    // 既存のチャット履歴を取得（同じ発言の同じ評価軸）
    const existingChats = await prisma.chat.findMany({
      where: {
        conversationId: params.id,
        aspect,
        statementIndex,
      },
      orderBy: { createdAt: 'asc' },
    })

    // AIレスポンスを生成
    const aiResponse = await generateAIResponse(
      conversation,
      aspect,
      statementIndex,
      userQuestion,
      existingChats,
      useReference
    )

    // チャットを保存
    const chat = await prisma.chat.create({
      data: {
        conversationId: params.id,
        aspect,
        statementIndex,
        userQuestion,
        aiResponse,
        useReference,
      },
      select: {
        id: true,
        aspect: true,
        statementIndex: true,
        userQuestion: true,
        aiResponse: true,
        useReference: true,
        createdAt: true,
      }
    })

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating chat:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAIResponse(
  conversation: any,
  aspect: string,
  statementIndex: number,
  userQuestion: string,
  existingChats: any[],
  useReference: boolean
) {
  const aspectDescriptions = {
    content: 'Content（内容）: 発言の内容の適切性、情報の正確性、論理的構成',
    emotion: 'Emotion（感情）: 感情表現の適切性、共感性、感情的サポート',
    structure: 'Structure（構造）: 会話の流れ、質問の仕方、応答の適切性',
    expression: 'Expression（表現）: 言葉遣い、表現の明確性、専門用語の使用'
  }

  let systemPrompt = `あなたは会話分析の専門家です。特に${aspectDescriptions[aspect as keyof typeof aspectDescriptions]}に関する質問に答えてください。`

  if (useReference) {
    systemPrompt += `\n\n学術的な根拠や参考文献を含めて回答してください。心理学、カウンセリング、コミュニケーション理論の観点から専門的な説明を行ってください。`
  }

  // 該当する発言を取得
  const aspectEvaluations = conversation.analysis[aspect] || []
  const targetStatement = aspectEvaluations[statementIndex]?.statement || '該当する発言が見つかりません'
  const targetEvaluation = aspectEvaluations[statementIndex]?.evaluation || '評価が見つかりません'

  const messages: any[] = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `分析対象の会話:\n${conversation.text}\n\n対象発言: "${targetStatement}"\n評価: ${targetEvaluation}\n\n全体の分析結果:\n${JSON.stringify(conversation.analysis, null, 2)}`
    }
  ]

  // 既存のチャット履歴を追加
  existingChats.forEach(chat => {
    messages.push({
      role: 'user',
      content: chat.userQuestion
    })
    messages.push({
      role: 'assistant',
      content: chat.aiResponse
    })
  })

  // 新しい質問を追加
  messages.push({
    role: 'user',
    content: userQuestion
  })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    return response.choices[0]?.message?.content || 'エラーが発生しました。もう一度お試しください。'
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw error
  }
}