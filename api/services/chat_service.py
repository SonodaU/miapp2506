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
        system,prompt = PromptManager.get_detailed_chat_prompt(
            text=request.conversation_text,
            aspect=request.aspect, 
            use_reference=request.use_reference,
        )
        
        # 分析結果から該当する発言の評価を取得
        # statement_contentを使って正しい評価を見つける
        statement_evaluation = None
        aspect_evaluations = request.analysis_result.get(request.aspect, [])
        
        # statement_contentが提供されている場合、それにマッチする評価を探す
        if request.statement_content:
            for evaluation in aspect_evaluations:
                eval_statement = evaluation.get('statement', '') or evaluation.get('content', '')
                # 発言の一部がマッチするかチェック（前方50文字で比較）
                if eval_statement and request.statement_content[:50] in eval_statement:
                    statement_evaluation = evaluation
                    break
        
        # マッチしない場合はstatement_indexを使用（フォールバック）
        if not statement_evaluation and request.statement_index < len(aspect_evaluations):
            statement_evaluation = aspect_evaluations[request.statement_index]
        
        # 評価が見つからない場合はエラーを返す
        if not statement_evaluation:
            raise ValueError(f"指定された発言の評価が見つかりません。発言内容: {request.statement_content[:50] if request.statement_content else 'なし'}...")
        
        # 評価結果を文字列として整理
        reply_content = f"""発言: {statement_evaluation.get('statement', request.statement_content or '')}

評価の根拠: {statement_evaluation.get('evaluation', '')}

フィードバック: {statement_evaluation.get('feedback', '')}

改善提案: {', '.join(statement_evaluation.get('suggestions', []))}

このフィードバックに関して質問はありますか。"""

        messages = [
            {"role": "developer", "content": system},
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": reply_content}
        ]
        
        # チャット履歴を追加
        messages.extend(request.chat_history)
        
        # 新しい質問を追加
        messages.append({"role": "user", "content": request.user_question})
        
        return await openai_service.create_chat_completion(
            messages=messages,
            api_key=request.api_key,
            search = request.use_reference
        )


# グローバルインスタンス
chat_service = ChatService()