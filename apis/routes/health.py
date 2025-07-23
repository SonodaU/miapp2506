"""
ヘルスチェックエンドポイント
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """ヘルスチェック"""
    return {"message": "Conversation Analysis API"}