# デプロイ手順書

## 概要
会話分析・評価Webアプリケーション（mi_app）のデプロイ手順です。

### アーキテクチャ構成
このアプリケーションは以下の3つのコンポーネントで構成されています：

1. **フロントエンド + バックエンドAPI** (Next.js) → Vercel
2. **Python FastAPI** → Vercel Serverless Functions
3. **データベース** → Supabase PostgreSQL

### デプロイ先
- **メインアプリ**: Vercel（ルートディレクトリから Next.js をデプロイ）
- **Python API**: Vercel Serverless Functions（`/api` フォルダ）
- **データベース**: Supabase

## 事前準備
- GitHubアカウント
- Vercelアカウント
- Supabaseアカウント

## ステップ1: Supabaseデータベースのセットアップ

### 1.1 Supabaseプロジェクトの作成
1. [Supabase](https://supabase.com)にアクセス
2. 「New project」をクリック
3. Organization を選択（個人の場合は自分のOrganization）
4. プロジェクト名を入力（例：`mi-app-production`）
5. データベースパスワードを設定（強力なパスワードを生成）
6. リージョンを選択（日本の場合は「Northeast Asia (Tokyo)」推奨）
7. 「Create new project」をクリック

### 1.2 データベース接続情報の取得
1. プロジェクトダッシュボードで「Settings」→「Database」に移動
2. 「Connection string」の「URI」をコピー
3. パスワード部分（`[YOUR-PASSWORD]`）を実際のパスワードに置き換え

## ステップ2: Vercelでのデプロイ

### 2.1 Vercelプロジェクトの作成
1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでサインイン
3. 「Add New」→「Project」をクリック
4. GitHubリポジトリ（mi_app）を選択
5. 「Import」をクリック

### 2.2 プロジェクト設定
- **Framework Preset**: Next.js（自動検出される）
- **Root Directory**: デフォルト（`.`）
- **Build and Output Settings**: デフォルト

### 2.3 各コンポーネントのデプロイ詳細

#### A. フロントエンド + Next.js API Routes (ルートディレクトリ)
**デプロイ方法**: Vercelが自動的にNext.jsアプリとして認識

**含まれるもの**:
- React フロントエンド（`src/app/`, `src/components/`）
- Next.js API Routes（`src/app/api/`）
- 認証システム（NextAuth.js）
- データベース操作（Prisma）

**自動的に処理される**:
- `npm install` - 依存関係のインストール
- `npm run build` - Next.js ビルド
- `npm run start` - プロダクション起動

#### B. Python FastAPI (`/api` フォルダ)
**デプロイ方法**: Vercel Serverless Functions として自動デプロイ

**必要なファイル**:
- `api/main.py` - FastAPI アプリケーション
- `api/requirements.txt` - Python 依存関係
- `vercel.json` - Vercel設定（後述）

**Vercel設定**:
プロジェクトルートに `vercel.json` を作成:
```json
{
  "functions": {
    "api/main.py": {
      "runtime": "python3.9"
    }
  },
  "routes": [
    {
      "src": "/api/python/(.*)",
      "dest": "/api/main.py"
    }
  ]
}
```

**アクセス方法**:
- フロントエンドから: `https://your-app.vercel.app/api/python/analyze`
- 直接アクセス: `https://your-app.vercel.app/api/python/`

#### C. データベース (Supabase)
**デプロイ方法**: マネージドサービスとして利用

**接続方法**:
- Next.js API Routes → Prisma → Supabase
- Python FastAPI → 直接接続（必要に応じて）

## ステップ3: 必要なファイルの作成

### 3.1 vercel.json の作成
プロジェクトルートに `vercel.json` を作成してPython FastAPIを有効化：

```json
{
  "functions": {
    "api/main.py": {
      "runtime": "python3.9"
    }
  },
  "routes": [
    {
      "src": "/api/python/(.*)",
      "dest": "/api/main.py"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 3.2 Python FastAPI の調整
`api/main.py` にVercel用の設定を追加：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app-name.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel用のハンドラー
def handler(request, context):
    return app(request, context)
```

## ステップ4: 環境変数の設定

### 4.1 必要な環境変数
Vercelの「Settings」→「Environment Variables」で以下を設定：

**Next.js用**:
```
DATABASE_URL=postgresql://postgres.xxx:[パスワード]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=ランダムな64文字の文字列
NEXTAUTH_URL=https://your-app-name.vercel.app
```

**Python FastAPI用**:
```
OPENAI_API_KEY=your-openai-api-key
```

### 4.2 NEXTAUTH_SECRETの生成
ターミナルで以下を実行：
```bash
openssl rand -base64 64
```

### 4.3 環境変数の確認
- **DATABASE_URL**: Supabaseから取得したPostgreSQL接続文字列
- **NEXTAUTH_SECRET**: 生成したランダム文字列
- **NEXTAUTH_URL**: Vercelから割り当てられたドメイン
- **OPENAI_API_KEY**: OpenAI APIキー

## ステップ5: データベースの初期化

### 5.1 Prismaマイグレーションの実行
1. Vercelでデプロイが完了後、「Functions」タブに移動
2. または、ローカルで以下を実行：
```bash
# 本番データベースへのマイグレーション
npx prisma migrate deploy
```

### 5.2 Prisma Clientの生成確認
```bash
npx prisma generate
```

## ステップ6: デプロイの実行

### 6.1 自動デプロイ
- GitHubにpushすると自動的にデプロイされます
- mainブランチへのpushで本番デプロイ
- 他のブランチではプレビューデプロイ

### 6.2 手動デプロイ
1. Vercelダッシュボードで「Deployments」タブ
2. 「Redeploy」ボタンをクリック

### 6.3 デプロイされるもの
1. **Next.js アプリケーション**: 
   - フロントエンド（React）
   - API Routes（認証、データベース操作）
   - 静的ファイル

2. **Python FastAPI**:
   - `/api/python/` 以下でアクセス可能
   - Serverless Functions として実行

3. **依存関係**:
   - `package.json` → Node.js 依存関係
   - `api/requirements.txt` → Python 依存関係

## ステップ7: 動作確認

### 7.1 基本機能の確認
1. デプロイされたURLにアクセス
2. ユーザー登録/ログイン機能をテスト
3. 会話分析機能をテスト
4. APIキー設定をテスト

### 7.2 各コンポーネントの動作確認

#### Next.js API Routes
- `https://your-app.vercel.app/api/auth/signin` - 認証
- `https://your-app.vercel.app/api/conversations` - 会話管理
- `https://your-app.vercel.app/api/user/api-key` - APIキー管理

#### Python FastAPI
- `https://your-app.vercel.app/api/python/` - ヘルスチェック
- `https://your-app.vercel.app/api/python/analyze` - 会話分析

### 7.3 データベース接続の確認
1. Supabaseダッシュボードで「Table Editor」を確認
2. ユーザー登録後にusersテーブルにデータが保存されることを確認

### 7.4 ログの確認
1. Vercel「Functions」タブでログを確認
2. エラーがないことを確認

## トラブルシューティング

### よくある問題と解決方法

#### 1. データベース接続エラー
- 環境変数DATABASE_URLの確認
- Supabaseのパスワードが正しいかチェック
- IPv6接続の問題の場合、IPv4を強制

#### 2. NextAuthエラー
- NEXTAUTH_SECRETが設定されているか確認
- NEXTAUTH_URLが正しいドメインか確認

#### 3. Python FastAPI関連エラー
- `vercel.json`の設定確認
- `api/requirements.txt`の依存関係確認
- Python runtime バージョンの確認

#### 4. Prismaマイグレーションエラー
```bash
# シャドウデータベースの問題の場合
npx prisma migrate resolve --applied 初期マイグレーション名
npx prisma db push
```

#### 5. ビルドエラー
- TypeScriptのタイプエラーを確認
- 依存関係が正しくインストールされているか確認
- Next.js と Python両方のビルドが成功するか確認

#### 6. CORS エラー
- Python FastAPIのCORS設定確認
- フロントエンドのドメインが正しく設定されているか確認

## セキュリティ設定

### 1. Supabase RLS（Row Level Security）
```sql
-- users テーブル
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid()::text = id);

-- conversations テーブル
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON conversations 
FOR ALL USING (auth.uid()::text = "userId");

-- chats テーブル
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats" ON chats 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = chats."conversationId" 
    AND conversations."userId" = auth.uid()::text
  )
);
```

### 2. Vercelセキュリティヘッダー
`vercel.json`ファイルを作成：
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

## 監視・運用

### 1. Vercel Analytics
- Vercelダッシュボードで「Analytics」を有効化
- パフォーマンス監視

### 2. エラー監視
- Sentryの設定（オプション）
- Vercelの「Functions」ログ監視

### 3. データベース監視
- Supabaseの「Database」→「Logs」でクエリ監視
- 定期的なバックアップ確認

## 更新・メンテナンス

### 1. 依存関係の更新
```bash
npm update
npm audit fix
```

### 2. データベーススキーマの更新
```bash
# 新しいマイグレーションの作成
npx prisma migrate dev --name 変更内容

# 本番への適用
npx prisma migrate deploy
```

### 3. 環境変数の管理
- 定期的なNEXTAUTH_SECRETのローテーション
- APIキーの定期更新

## バックアップ

### 1. データベースバックアップ
- Supabaseの自動バックアップ（7日間保持）
- 手動エクスポートの定期実行

### 2. コードバックアップ
- GitHubリポジトリが主要なバックアップ
- 重要なブランチの保護設定

## 参考リンク
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)