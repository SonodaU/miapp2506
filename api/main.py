from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
import os
from dotenv import load_dotenv
import asyncio
from openai import AsyncOpenAI
import json

load_dotenv()

app = FastAPI(title="Conversation Analysis API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-vercel-domain.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI クライアント
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 評価軸の型定義
EvaluationAxis = Literal['cct', 'sst', 'empathy', 'partnership']

class ConversationAnalysisRequest(BaseModel):
    text: str
    target_behavior: Optional[str] = None

class DetailedChatRequest(BaseModel):
    conversation_text: str
    analysis_result: Dict[str, Any]
    aspect: EvaluationAxis
    user_question: str
    chat_history: List[Dict[str, str]] = []
    use_reference: bool = False

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    model: str = "gpt-4o"
    temperature: float = 0.3
    max_tokens: int = 4000

class ChatResponse(BaseModel):
    response: str

class AnalysisResponse(BaseModel):
    cct: List[Dict[str, Any]]
    sst: List[Dict[str, Any]] 
    empathy: List[Dict[str, Any]]
    partnership: List[Dict[str, Any]]

@app.get("/")
async def root():
    return {"message": "Conversation Analysis API"}

# プロンプト管理システム
class PromptManager:
    """すべてのAIプロンプトを一元管理するクラス"""
    
    @staticmethod
    def get_aspect_description(aspect: EvaluationAxis) -> str:
        """評価軸の説明を取得"""
        descriptions = {
            'cct':"""チェンジトークが促進されたか評価する。
チェンジトークとは「クライエントから出る，変化を志向した言葉」のことです。以下の例が高評価となります。
- 変化に向かうクライエントの発言だけを選択的に強化する。
- 変化に向かうクライエントの発言を具体化する。
- チェンジトークが出た際，深掘りする""",
                   "sst": """維持トークを弱められたかを評価する。
維持トークとは現状維持を選ぶクライエントの言葉のことです。以下の例が高評価となります。
・変わることの難しさやデメリットの話を長引かせない。話の強さや勢いを弱める。
・維持トークにつながる発言をしない""",
                   "partnership": """互いに対等で，問題解決に役立つ知識を備えていると臨床家が思っているかを評価しなさい。
変化についての専門知識のほとんどは，クライエントが持つと，臨床家が伝えているかを見ます。以下が高評価です。
- 選択肢や計画を示し，相手が選びやすいようにする
- クライエントを明確に専門家や意思決定者として認識する
- クライエントが持っている情報に応じてどうアドバイスするか変える
- 臨床家が専門家の役割をしない。""",
                   "empathy": """クライエントの観点や経験を把握しようと努力しているか評価しなさい。以下の例で高い評価になります。
- クライエントの観点、価値観、人生観について、興味を持って理解していると，クライエントに示す。例えば「複雑な聞き返し」を使って，まだ言っていないことを言ってみせる。
- クライエントの価値観や見解に興味をもって，深掘りする"""
        }
        return descriptions.get(aspect, aspect)
    
    @staticmethod
    def get_analysis_prompt(text: str, aspect: EvaluationAxis, target_behavior: Optional[str] = None) -> str:
        """分析用プロンプトを生成"""
        base_prompt = f"""以下の対話文を{PromptManager.get_aspect_description(aspect)}の観点から分析してください。重要な発言を抽出し、以下の項目で評価してください：
"""
        
        # target_behaviorが指定されている場合、プロンプトに追加
        if target_behavior:
            base_prompt += f"""

【重要】クライエントの変えたい行動・目標: {target_behavior}
この目標に関連する発言を特に重視して分析してください。"""
        
        criteria = {
            'cct': ["変化への動機付け", "クライアントの自律性尊重", "選択肢の提示", "前向きな発言の引き出し"],
            'sst': ["感情への適切な対応", "共感的理解の表現", "感情の受容と反映", "安心感の提供"],
            'empathy': ["感情の理解と反映", "共感的な応答", "非言語的サインへの注意", "クライアントの視点の受容"],
            'partnership': ["協働姿勢の表現", "対等な関係性の構築", "共同作業への誘導", "クライアントの専門性の尊重"]
        }
        
        for i, criterion in enumerate(criteria.get(aspect, []), 1):
            base_prompt += f"\n{i}. {criterion}"
        
        base_prompt += f"""
対話文:
{text}

重要な発言を最大5つ抽出し、以下のJSON形式で返してください：
[
  {{
    "statement": "発言（意味のない発言は無視すること）",
    "evaluation": "評価の根拠",
    "score": 1-5の評価点,
    "feedback": "具体的なフィードバック",
    "suggestions": ["改善提案1", "改善提案2"]代替案，修正案。いい評価のときに提案してもよい。考え方の道筋も示すこと。,
    "icon": "good/warning/bad"
  }}
]

iconは以下の基準で判定してください：
- good: 適切で効果的な発言 (score 4-5)
- warning: 改善の余地がある発言 (score 2-3)
- bad: 不適切または問題のある発言 (score 1)
"""
        return base_prompt
    
    @staticmethod
    def get_detailed_chat_system_prompt(aspect: EvaluationAxis, use_reference: bool) -> str:
        """詳細チャット用システムプロンプトを生成"""
        base_prompt = f"あなたは会話分析の専門家です。特に{PromptManager.get_aspect_description(aspect)}に関する質問に答えてください。"
        
        if use_reference:
            base_prompt += """

学術的な根拠や参考文献を含めて回答してください。心理学、カウンセリング、コミュニケーション理論の観点から専門的な説明を行ってください。
可能な限り具体的な研究結果や理論名を挙げて説明してください。"""
        
        return base_prompt

@app.post("/detailed-chat", response_model=ChatResponse)  
async def detailed_chat(request: DetailedChatRequest):
    """詳細分析チャット - プロンプト管理を一元化"""
    try:
        system_prompt = PromptManager.get_detailed_chat_system_prompt(
            request.aspect, 
            request.use_reference
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user", 
                "content": f"分析対象の会話:\n{request.conversation_text}\n\n分析結果:\n{json.dumps(request.analysis_result, ensure_ascii=False, indent=2)}"
            }
        ]
        
        # チャット履歴を追加
        messages.extend(request.chat_history)
        
        # 新しい質問を追加
        messages.append({"role": "user", "content": request.user_question})
        
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=4000
        )
        
        return ChatResponse(
            response=response.choices[0].message.content or "エラーが発生しました。もう一度お試しください。"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"詳細チャットエラー: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """汎用チャットエンドポイント - 下位互換性のため残す"""
    try:
        response = await client.chat.completions.create(
            model=request.model,
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=response.choices[0].message.content or "エラーが発生しました。もう一度お試しください。"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"チャットエラー: {str(e)}")

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_conversation(request: ConversationAnalysisRequest):
    """会話テキストを4つの評価軸で分析"""
    try:
        # 4つの分析を並行実行
        tasks = [
            analyze_cct(request.text, request.target_behavior),
            analyze_sst(request.text, request.target_behavior),
            analyze_empathy(request.text, request.target_behavior),
            analyze_partnership(request.text, request.target_behavior)
        ]
        
        cct_result, sst_result, empathy_result, partnership_result = await asyncio.gather(*tasks)
        
        return AnalysisResponse(
            cct=cct_result,
            sst=sst_result,
            empathy=empathy_result,
            partnership=partnership_result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析エラー: {str(e)}")

async def analyze_cct(text: str, target_behavior: Optional[str] = None) -> List[Dict[str, Any]]:
    """チェンジトーク促進分析 - PromptManagerを使用"""
    prompt = PromptManager.get_analysis_prompt(text, 'cct', target_behavior)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return parse_analysis_response(response.choices[0].message.content)

async def analyze_sst(text: str, target_behavior: Optional[str] = None) -> List[Dict[str, Any]]:
    """感情と共感分析 - PromptManagerを使用"""
    prompt = PromptManager.get_analysis_prompt(text, 'sst', target_behavior)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return parse_analysis_response(response.choices[0].message.content)

async def analyze_empathy(text: str, target_behavior: Optional[str] = None) -> List[Dict[str, Any]]:
    """共感分析 - PromptManagerを使用"""
    prompt = PromptManager.get_analysis_prompt(text, 'empathy', target_behavior)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return parse_analysis_response(response.choices[0].message.content)

async def analyze_partnership(text: str, target_behavior: Optional[str] = None) -> List[Dict[str, Any]]:
    """パートナーシップ分析 - PromptManagerを使用"""
    prompt = PromptManager.get_analysis_prompt(text, 'partnership', target_behavior)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return parse_analysis_response(response.choices[0].message.content)

def parse_analysis_response(response_text: str) -> List[Dict[str, Any]]:
    """GPT-4の応答をパースしてJSONに変換"""
    try:
        import json
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)