"""
分析関連エンドポイント
"""
from fastapi import APIRouter, HTTPException
from models.requests import ConversationAnalysisRequest
from models.responses import AnalysisResponse
from services.analysis_service import analysis_service

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_conversation(request: ConversationAnalysisRequest):
    """会話テキストを4つの評価軸で分析"""
    try:
        result = await analysis_service.analyze_conversation(
            request.text,
            request.target_behavior,
            request.api_key
        )
        
        return AnalysisResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析エラー: {str(e)}")