"""
プロンプト管理システム
"""
from typing import Optional
from models.types import EvaluationAxis
from .developer_message import DeveloperMessageConfig


class PromptManager:
    """すべてのAIプロンプトを一元管理するクラス"""
    
    @staticmethod
    def get_aspect_description(aspect: EvaluationAxis) -> str:
        """評価軸の説明を取得"""
        descriptions = {
            'cct': """チェンジトークが促進されたか評価する。
チェンジトークとは「クライエントから出る，変化を志向した言葉」のことです。以下の例が高評価となります。
- 変化に向かうクライエントの発言だけを選択的に強化する。
- 変化に向かうクライエントの発言を具体化する。
- チェンジトークが出た際，深掘りする""",
            "sst": """維持トークを弱められたかを評価する。
維持トークとは現状維持を選ぶクライエントの言葉のことです。以下の例が高評価となります。
・変わることの難しさやデメリットの話を長引かせない。話の強さや勢いを弱める。
・維持トークにつながる発言をしない""",
            "partnership": """パートナーシップがあるか，すなわち互いに対等で，問題解決に役立つ知識を備えていると臨床家が思っているかを評価しなさい。
変化についての専門知識のほとんどは，クライエントが持つと，臨床家が伝えているかを見ます。以下が高評価です。
- 選択肢や計画を示し，相手が選びやすいようにする
- クライエントを明確に専門家や意思決定者として認識する
- クライエントが持っている情報に応じてどうアドバイスするか変える
- 臨床家が専門家の役割をしない。""",
            "empathy": """共感性の評価。クライエントの観点や経験を**把握しようと努力しているか**評価する。以下の例で高い評価になります。
- クライエントの観点、価値観、人生観について、興味を持って理解していると，クライエントに示す。例えば「複雑な聞き返し」を使って，まだ言っていないことを言ってみせる。
- クライエントの価値観や見解に興味をもって，深掘りする"""
        }
        return descriptions.get(aspect, aspect) # キーがない時はそのまま返す
    
    @staticmethod
    def get_analysis_prompt(text: str, aspect: EvaluationAxis, target_behavior: Optional[str] = None) -> str:
        """分析用プロンプトを生成"""
        developer_message = DeveloperMessageConfig.get_system_message(analysys=True)
        base_prompt = f"""
# 指示
対話文を与えるので，以下の評価軸で分析してください。
臨床家（治療を行う者）の発言から重要なものを抽出し評価してください。
# 評価軸
{PromptManager.get_aspect_description(aspect)}
# 目標行動
            {target_behavior}
　これは、クライエントが変化を望む行動や目標です。この目標に動機づけされるよう評価しなさい。
# 出力形式
重要な発言を最大5つ抽出し、以下のJSON形式で返してください：
[
  {{
    "statement": "発言（意味のない発言は無視すること）",
    "evaluation": "評価の根拠（内部処理用でユーザには見せない）",
    "score": 1-5の評価点,
    "feedback": "具体的なフィードバック（ユーザに見せる）",
    "suggestions": ["改善提案1", "改善提案2(optional)"]フィードバックを踏まえた，よりよい発言の具体例。もしあれば補足説明。
    "icon": "good/warning/bad"
  }}
]
# 対話文
{text}
"""
        return developer_message,base_prompt
    
    @staticmethod
    def get_detailed_chat_prompt(text: str, aspect: EvaluationAxis, use_reference: bool,target_behavior: Optional[str] = None) -> str:
        """詳細チャット用"""
        developer_message = DeveloperMessageConfig.get_system_message()
        base_prompt = f"""
        # 指示
        対話文を与えるので，以下の評価軸で分析してください。
        臨床家（治療を行う者）の発言から重要なものを抽出し評価してください。
        # 評価軸
        {PromptManager.get_aspect_description(aspect)}
        # 対話文
        {text}
        """
        
        if use_reference:
            base_prompt += """

学術的な根拠や参考文献を含めて回答してください。心理学、カウンセリング、コミュニケーション理論の観点から専門的な説明を行ってください。
可能な限り具体的な研究結果や理論名を挙げて説明してください。"""
        
        return developer_message,base_prompt.strip()