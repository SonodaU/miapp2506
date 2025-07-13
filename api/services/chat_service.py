"""
チャットサービス
"""
import json
from typing import List, Dict
from models.requests import DetailedChatRequest
from core.prompt_manager import PromptManager
from .openai_service import openai_service


class ChatService:
    """チャット機能サービス"""
    
    async def detailed_chat(self, request: DetailedChatRequest) -> str:
        """詳細分析チャット"""
        system_prompt = PromptManager.get_detailed_chat_system_prompt(
            request.aspect, 
            request.use_reference
        )
        
        messages = [
            {"role": "developer", "content": system_prompt},
            {
                "role": "user", 
                "content": f"分析対象の会話:\n{request.conversation_text}\n\n分析結果:\n{json.dumps(request.analysis_result, ensure_ascii=False, indent=2)}"
            }
        ]
        
        # チャット履歴を追加
        messages.extend(request.chat_history)
        
        # 新しい質問を追加
        messages.append({"role": "user", "content": request.user_question})
        
        return await openai_service.create_chat_completion(
            messages=messages,
            api_key=request.api_key
        )
    


# グローバルインスタンス
chat_service = ChatService()