import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OpenAI } from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const conversationSchema = z.object({
  text: z.string().min(1),
})

async function analyzeConversation(text: string) {
  const analysisPrompt = `
以下の会話テキストを4つの評価軸で分析してください：

1. Content（内容）: 発言の内容の適切性、情報の正確性、論理的構成
2. Emotion（感情）: 感情表現の適切性、共感性、感情的サポート
3. Structure（構造）: 会話の流れ、質問の仕方、応答の適切性
4. Expression（表現）: 言葉遣い、表現の明確性、専門用語の使用

会話テキスト:
${text}

各評価軸について、重要な発言を抽出し、以下のJSON形式で結果を返してください：

{
  "content": [
    {
      "statement": "具体的な発言内容",
      "evaluation": "評価コメント",
      "icon": "good|warning|bad"
    }
  ],
  "emotion": [...],
  "structure": [...],
  "expression": [...]
}

各評価軸で最大5つの重要な発言を抽出してください。
icon は以下の基準で判定してください：
- good: 適切で効果的な発言
- warning: 改善の余地がある発言
- bad: 不適切または問題のある発言
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたは会話分析の専門家です。セラピーやカウンセリングの会話を専門的に分析し、建設的なフィードバックを提供します。'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // JSON部分を抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid response format')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error analyzing conversation:', error)
    throw error
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

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
    const { text } = conversationSchema.parse(body)

    // 会話を分析
    const analysis = await analyzeConversation(text)

    // データベースに保存
    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        text,
        analysis,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        analysis: true,
      }
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}