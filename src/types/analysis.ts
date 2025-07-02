export interface AnalysisStatement {
  statement: string;
  content?: string;
  evaluation?: string;
  emotion?: string;
  function?: string;
  clarity?: string;
  score: number;
  feedback: string;
  suggestions: string[];
  icon?: 'good' | 'warning' | 'bad';
}

export interface AnalysisResult {
  [key: string]: AnalysisStatement[] | undefined;
  cct?: AnalysisStatement[];
  sst?: AnalysisStatement[];
  empathy?: AnalysisStatement[];
  partnership?: AnalysisStatement[];
}

export interface Conversation {
  id: string;
  text: string;
  analysis: AnalysisResult;
  createdAt: string;
}

export interface Chat {
  id: string;
  conversationId: string;
  aspect: string;
  statementIndex: number;
  userQuestion: string;
  aiResponse: string;
  useReference: boolean;
  createdAt: string;
}

export interface ConversationWithChats extends Conversation {
  chats: Chat[];
}

export interface AnalysisApiResponse {
  cct: AnalysisStatement[];
  sst: AnalysisStatement[];
  empathy: AnalysisStatement[];
  partnership: AnalysisStatement[];
}

export type EvaluationAxis = 'cct' | 'sst' | 'empathy' | 'partnership';