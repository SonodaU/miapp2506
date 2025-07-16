"""
分析サービス
"""
import asyncio
from typing import List, Dict, Any, Optional
from models.types import EvaluationAxis
from core.prompt_manager import PromptManager
from core.utils import parse_analysis_response
from .openai_service import openai_service


class AnalysisService:
    """会話分析サービス"""
    
    async def analyze_conversation(
        self,
        text: str,
        target_behavior: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """会話テキストを4つの評価軸で分析"""
        # 4つの分析を並行実行
        tasks = [
            self._analyze_axis(text, 'cct', target_behavior, api_key),
            self._analyze_axis(text, 'sst', target_behavior, api_key),
            self._analyze_axis(text, 'empathy', target_behavior, api_key),
            self._analyze_axis(text, 'partnership', target_behavior, api_key)
        ]
        
        cct_result, sst_result, empathy_result, partnership_result = await asyncio.gather(*tasks)
        
        return {
            'cct': cct_result,
            'sst': sst_result,
            'empathy': empathy_result,
            'partnership': partnership_result
        }
    
    async def _analyze_axis(
        self,
        text: str,
        aspect: EvaluationAxis,
        target_behavior: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """特定の評価軸で分析"""
        system, prompt = PromptManager.get_analysis_prompt(text, aspect, target_behavior)
        
        response = await openai_service.create_chat_completion(
            messages=[
                {"role": "developer", "content": system},
                {"role": "user", "content": prompt}],
            api_key=api_key
        )
        
        return parse_analysis_response(response)


# グローバルインスタンス
analysis_service = AnalysisService()