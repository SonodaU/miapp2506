import { Conversation, ConversationWithChats, Chat, EvaluationAxis } from '@/types/analysis';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.error || 'API request failed');
  }

  return response.json();
}

export const apiClient = {
  // 会話分析
  async createConversation(text: string, targetBehavior?: string): Promise<Conversation> {
    return fetchApi<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ text, targetBehavior }),
    });
  },

  async getConversations(): Promise<Conversation[]> {
    return fetchApi<Conversation[]>('/api/conversations');
  },

  async getConversation(id: string): Promise<ConversationWithChats> {
    return fetchApi<ConversationWithChats>(`/api/conversations/${id}`);
  },

  async deleteConversation(id: string): Promise<void> {
    return fetchApi<void>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  // チャット機能
  async sendChatMessage(
    conversationId: string,
    aspect: EvaluationAxis,
    question: string,
    statementIndex: number,
    useReference: boolean = false,
    statementContent?: string
  ): Promise<Chat> {
    const requestData = {
      aspect,
      question,
      statementIndex,
      useReference,
      statementContent,
    };
    
    console.log('API Client - sendChatMessage request:', {
      url: `/api/conversations/${conversationId}/chat`,
      data: requestData
    });
    
    try {
      const result = await fetchApi<Chat>(`/api/conversations/${conversationId}/chat`, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });
      
      console.log('API Client - sendChatMessage success:', result);
      return result;
    } catch (error) {
      console.error('API Client - sendChatMessage error:', error);
      throw error;
    }
  },

  // APIキー管理
  async getApiKeyInfo(): Promise<{ hasApiKey: boolean; apiKeyPreview: string | null }> {
    return fetchApi<{ hasApiKey: boolean; apiKeyPreview: string | null }>('/api/user/api-key');
  },

  async updateApiKey(apiKey: string): Promise<void> {
    return fetchApi<void>('/api/user/api-key', {
      method: 'PUT',
      body: JSON.stringify({ apiKey }),
    });
  },
};

export { ApiError };