"""
アプリケーション設定管理
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""
    
    # アプリケーション基本設定
    app_name: str = "Conversation Analysis API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # OpenAI API設定
    openai_model: str = "gpt-4.1" # 変更してはいけない
    openai_temperature: float = 0.3
    openai_max_tokens: int = 8000
    openai_timeout: int = 120  # タイムアウト（秒）
    
    # CORS設定
    allowed_origins: List[str] = [
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ]
    
    # サーバー設定
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# グローバル設定インスタンス
settings = Settings()