import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { config } from '@/lib/config'
import { handleApiError, AppError } from '@/lib/error-handler'
import { sendAnalysisCompleteEmail } from '@/lib/email'
import { z } from 'zod'
import type { AnalysisResult, AnalysisApiResponse, EvaluationAxis } from '@/types/analysis'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const conversationSchema = z.object({
  text: z.string().min(1).max(config.analysis.maxTextLength),
  targetBehavior: z.string().optional(),
})

const chatSchema = z.object({
  aspect: z.enum(['cct', 'sst', 'empathy', 'partnership']),
  question: z.string().min(1).max(1000),
  useReference: z.boolean().optional().default(false),
  statementIndex: z.number().int().min(0),
  statementContent: z.string().optional().default(''),
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
        api_key: apiKey
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

async function processAnalysisAsync(
  conversationId: string,
  text: string,
  targetBehavior: string | undefined,
  apiKey: string,
  userEmail: string
) {
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'processing' }
    })

    const analysis = await analyzeConversation(text, targetBehavior, apiKey)

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        analysis: analysis as any,
        status: 'completed'
      }
    })

    const analysisUrl = `${process.env.NEXTAUTH_URL}/analysis/${conversationId}`
    await sendAnalysisCompleteEmail(userEmail, conversationId, analysisUrl)

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { emailNotified: true }
    })

    console.log(`Analysis completed and email sent for conversation ${conversationId}`)
  } catch (error) {
    console.error(`Error processing analysis for conversation ${conversationId}:`, error)
    
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'failed' }
    })
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
  const chatHistory = existingChats.flatMap(chat => [
    { role: 'user', content: chat.userQuestion },
    { role: 'assistant', content: chat.aiResponse }
  ])

  try {
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.pythonApi.timeout)
    
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
    const [conversationId, action] = paramsArray

    // List all conversations
    if (!conversationId) {
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
    }

    // Get specific conversation
    if (!action) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
        },
        include: {
          chats: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json({
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        chats: conversation.chats.map(chat => ({
          ...chat,
          createdAt: chat.createdAt.toISOString(),
        }))
      })
    }

    // Get chats for conversation
    if (action === 'chat') {
      const { searchParams } = new URL(request.url)
      const aspect = searchParams.get('aspect')
      const statementIndex = searchParams.get('statementIndex')

      const whereClause: any = {
        conversation: {
          id: conversationId,
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
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
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
  { params }: { params: { params?: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const paramsArray = params.params || []
    const [conversationId, action] = paramsArray

    // Create new conversation
    if (!conversationId) {
      const body = await request.json()
      const { text, targetBehavior } = conversationSchema.parse(body)

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

      const apiKey = user.openaiApiKey || process.env.OPENAI_API_KEY

      if (!apiKey) {
        return NextResponse.json({ 
          error: 'OpenAI APIキーが設定されていません。管理者にお問い合わせください。' 
        }, { status: 500 })
      }

      const textLength = text.trim().length
      const isLongText = textLength > 2000

      if (isLongText) {
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

        processAnalysisAsync(conversation.id, text, targetBehavior, apiKey, user.email)

        return NextResponse.json(
          {
            ...conversation,
            createdAt: conversation.createdAt.toISOString(),
          },
          { status: 202 }
        )
      } else {
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
    }

    // Create chat message
    if (action === 'chat') {
      const body = await request.json()
      console.log('Chat API - Request body:', JSON.stringify(body, null, 2))
      
      const { aspect, question, useReference, statementIndex, statementContent } = chatSchema.parse(body)
      console.log('Chat API - Parsed data:', { aspect, question, useReference, statementIndex, statementContent })

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
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

      const apiKey = conversation.user.openaiApiKey || process.env.OPENAI_API_KEY

      if (!apiKey) {
        return NextResponse.json({ 
          error: 'OpenAI APIキーが設定されていません。ダッシュボードでAPIキーを設定するか、管理者にお問い合わせください。' 
        }, { status: 500 })
      }

      const existingChats = await prisma.chat.findMany({
        where: {
          conversationId: conversationId,
          aspect,
          statementIndex,
        },
        orderBy: { createdAt: 'asc' },
        take: config.ui.maxChatHistory,
      })

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

      const chat = await prisma.chat.create({
        data: {
          conversationId: conversationId,
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
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  } catch (error) {
    console.error('Conversations API - Error occurred:', error)
    
    if (error instanceof z.ZodError) {
      console.error('Conversations API - Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    const errorDetails = handleApiError(error)
    console.error('Conversations API - Handled error:', errorDetails)
    return NextResponse.json(
      { error: errorDetails.message },
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
    const [conversationId] = paramsArray

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.conversation.delete({
      where: { id: conversationId }
    })

    return NextResponse.json({ message: 'Conversation deleted successfully' })
  } catch (error) {
    const errorDetails = handleApiError(error)
    return NextResponse.json(
      { error: errorDetails.message },
      { status: errorDetails.status || 500 }
    )
  }
}