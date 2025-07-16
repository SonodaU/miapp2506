export const config = {
  // Python API設定
  pythonApi: {
    url: process.env.PYTHON_API_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.PYTHON_API_TIMEOUT || '120000'), // 120秒（2分）
  },

  // OpenAI設定
  openai: {
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 4000,
  },

  // NextAuth設定
  auth: {
    secret: process.env.NEXTAUTH_SECRET!,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // データベース設定
  database: {
    url: process.env.DATABASE_URL!,
  },

  // 分析設定
  analysis: {
    maxTextLength: 10000,
    evaluationAxes: ['cct', 'sst', 'empathy', 'partnership'] as const,
  },

  // UI設定
  ui: {
    maxChatHistory: 50,
  },
} as const;

export type Config = typeof config;