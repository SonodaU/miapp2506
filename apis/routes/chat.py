"""
チャット関連エンドポイント
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from models.requests import DetailedChatRequest
from models.responses import ChatResponse
from services.chat_service import chat_service

router = APIRouter(tags=["chat"])


@router.post("/detailed-chat", response_model=ChatResponse)
async def detailed_chat(
    request: DetailedChatRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """詳細分析チャット"""
    try:
        response = await chat_service.detailed_chat(request, x_api_key)
        return ChatResponse(response=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"詳細チャットエラー: {str(e)}")