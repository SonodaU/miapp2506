# Python API Server

PythonでOpenAI APIを使用した会話分析を行うFastAPIサーバーです。

## セットアップ

1. 依存関係のインストール:
```bash
cd api
pip install -r requirements.txt
```

2. 環境変数の設定:
```bash
cp .env.example .env
# OPENAI_API_KEYを設定
```

3. サーバーの起動:
```bash
python main.py
# または
uvicorn main:app --reload
```

## API仕様

### POST /analyze
会話テキストを4つの評価軸で分析します。

**リクエスト:**
```json
{
  "text": "分析したい会話テキスト"
}
```

**レスポンス:**
```json
{
  "content": [...],
  "emotion": [...], 
  "structure": [...],
  "expression": [...]
}
```

## Dockerでの実行

```bash
cd api
docker build -t conversation-api .
docker run -p 8000:8000 --env-file .env conversation-api
```

## 本番環境での設定

- `main.py`のCORS設定で本番ドメインを追加
- 環境変数 `PYTHON_API_URL` をNext.jsアプリで設定