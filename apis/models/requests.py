"""
リクエストモデル定義
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from models.types import EvaluationAxis


class ConversationAnalysisRequest(BaseModel):
    """会話分析リクエスト"""
    text: str
    target_behavior: Optional[str] = None


class DetailedChatRequest(BaseModel):
    """詳細チャットリクエスト"""
    conversation_text: str
    analysis_result: Dict[str, Any]
    aspect: EvaluationAxis
    user_question: str
    chat_history: List[Dict[str, str]] = []
    use_reference: bool = False
    statement_index: int = 0
    statement_content: Optional[str] = None


