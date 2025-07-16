"""
OpenAI API連携サービス
"""
import os
from typing import List, Dict
from openai import AsyncOpenAI
from config.settings import settings


class OpenAIService:
    """OpenAI APIとの連携を管理するサービス"""
    
    def __init__(self):
        self.default_client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY"),
            timeout=settings.openai_timeout
        )
    
    def _get_client(self, api_key: str = None) -> AsyncOpenAI:
        """API keyに応じてクライアントを取得"""
        if api_key:
            return AsyncOpenAI(
                api_key=api_key,
                timeout=settings.openai_timeout
            )
        return self.default_client
    
    async def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = None,
        max_tokens: int = None,
        api_key: str = None
    ) -> str:
        """チャット補完を実行"""
        client = self._get_client(api_key)
        response = await client.chat.completions.create(
            model=model or settings.openai_model,
            messages=messages,
            temperature=temperature or settings.openai_temperature,
            max_tokens=max_tokens or settings.openai_max_tokens
        )
        
        return response.choices[0].message.content or "エラーが発生しました。もう一度お試しください。"


# グローバルインスタンス
openai_service = OpenAIService()