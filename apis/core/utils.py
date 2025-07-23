"""
ユーティリティ関数
"""
import json
from typing import List, Dict, Any


def parse_analysis_response(response_text: str) -> List[Dict[str, Any]]:
    """GPT-4の応答をパースしてJSONに変換"""
    try:
        # JSONの開始と終了を見つける
        start = response_text.find('[')
        end = response_text.rfind(']') + 1
        
        if start != -1 and end != 0:
            json_text = response_text[start:end]
            return json.loads(json_text)
        else:
            # JSONが見つからない場合のフォールバック
            return [{"error": "分析結果のパースに失敗しました"}]
    except json.JSONDecodeError:
        return [{"error": "分析結果のパースに失敗しました"}]