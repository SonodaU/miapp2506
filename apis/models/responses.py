"""
レスポンスモデル定義
"""
from typing import List, Dict, Any
from pydantic import BaseModel


class ChatResponse(BaseModel):
    """チャットレスポンス"""
    response: str


class AnalysisResponse(BaseModel):
    """分析レスポンス"""
    cct: List[Dict[str, Any]]
    sst: List[Dict[str, Any]] 
    empathy: List[Dict[str, Any]]
    partnership: List[Dict[str, Any]]