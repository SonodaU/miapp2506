# CLAUDE.md - 会話分析・評価Webアプリケーション

## コーディング原則
- 可能な限り同じコードを繰り返さない。
- 

## プロジェクト概要
AIを活用した高度な会話分析・評価システム。セラピーセッションなどの専門的な会話テキストを4つの評価軸（Content、Emotion、Structure、Expression）で多角的に分析し、詳細なフィードバックと改善提案を提供する。ユーザー認証とデータ永続化により、分析履歴の管理と継続的な改善をサポートする。

## 主要機能
1. **ユーザー認証システム** - セキュアなログイン/サインアップ機能
2. **会話テキスト分析** - 4つの評価軸による並行分析処理
3. **インタラクティブな詳細質問** - AIとのチャット形式での深掘り分析
4. **分析履歴管理** - 過去の分析結果の保存・閲覧・比較
5. **レスポンシブデザイン** - デスクトップ・タブレット・モバイル対応

## 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **言語**: TypeScript
- **UI Library**: shadcn/ui + Radix UI
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand + React Query (TanStack Query)
- **フォーム**: React Hook Form + Zod
- **認証**: NextAuth.js

### バックエンド
- **API Framework**: Next.js API Routes + FastAPI (Python)
- **ORM**: Prisma
- **データベース**: PostgreSQL (Supabase)
- **認証**: NextAuth.js + JWT
- **AI API**: OpenAI GPT-4o (Python FastAPI経由)

### インフラストラクチャ
- **ホスティング**: Vercel
- **データベース**: Supabase
- **ファイルストレージ**: Supabase Storage（将来的な拡張用）

## UIデザイン仕様

### ログインページ
シンプルで洗練されたログイン画面。中央配置のカードレイアウトで、メールアドレスとパスワードの入力フィールド、ログインボタン、新規登録へのリンクを配置。エラーメッセージ表示エリアも含む。

### メインダッシュボード
ヘッダーにアプリケーションタイトルとユーザー情報（アバター、名前、ログアウトボタン）を配置。メインエリアは左側に新規分析セクション、右側に最近の分析履歴リストを表示する2カラムレイアウト。

### 分析ページ（入力→結果表示の統合画面）
単一ページ内で入力から結果表示まで完結する設計。上部に大きなテキストエリアを配置し、会話テキストの入力を促す。プレースホルダーには入力例を表示。分析開始ボタンは目立つようにプライマリーカラーで中央配置。

分析実行後、同じページ内で下部に結果を表示。スムーズなスクロールアニメーションで結果セクションへ自動移動。4つの評価カード（Content、Emotion、Structure、Expression）をよこ4列のタブレイアウトで表示。各カードには評価軸名、評価結果リスト（発言と評価アイコン）を表示。カードはホバー時に軽くリフトアップするアニメーション付き。

分析中はテキストエリアとボタンの間にローディングアニメーションと進捗表示を挿入。結果表示後も上部の入力エリアは維持され、新たな分析を即座に開始可能。

### 詳細分析ダイアログ
モーダルダイアログとして実装。上部に対象発言と基本評価情報を固定表示。中央部はスクロール可能なチャット履歴エリア。下部に質問入力フィールドと文献参照オプション、送信ボタンを配置。

### レスポンシブ対応
- **デスクトップ（1024px以上）**: フル機能、2カラムレイアウト
- **タブレット（768px-1023px）**: カード幅調整、1カラムレイアウトへ変更
- **モバイル（767px以下）**: 縦スクロール最適化、タッチ操作対応

## API仕様

### 認証エンドポイント
```
POST /api/auth/register - 新規ユーザー登録 ✅
POST /api/auth/[...nextauth] - NextAuth.js エンドポイント ✅
GET /api/auth/signin - サインイン ✅
POST /api/auth/signout - サインアウト ✅
```

### 分析エンドポイント
```
POST /api/conversations - 新規会話分析 ✅
GET /api/conversations - 分析履歴一覧取得 ✅
GET /api/conversations/[id] - 特定の分析結果取得 ✅
DELETE /api/conversations/[id] - 分析結果削除 ✅
POST /api/conversations/[id]/chat - 詳細質問チャット ✅
```

### Python API エンドポイント（予定）
```
POST /analyze - 会話テキストの4軸分析 🚧
GET / - API ヘルスチェック 🚧
```

#### 記号説明
- ✅ 実装済み
- 🚧 実装中/未実装

## データモデル

### User
```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  password      String
  name          String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  conversations Conversation[]
  
  @@map("users")
}
```

### Conversation
```prisma
model Conversation {
  id         String    @id @default(cuid())
  userId     String
  text       String    @db.Text
  analysis   Json
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  chats      Chat[]
  
  @@index([userId])
  @@map("conversations")
}
```

### Chat
```prisma
model Chat {
  id             String       @id @default(cuid())
  conversationId String
  aspect         String
  statementIndex Int          @default(0)
  userQuestion   String       @db.Text
  aiResponse     String       @db.Text
  useReference   Boolean      @default(false)
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([conversationId, aspect, statementIndex])
  @@map("chats")
}
```

## セキュリティ実装

### 認証・認可
- JWT トークンベース認証
- セッション管理（NextAuth.js）
- APIルートレベルでの認証チェック
- ユーザー別データアクセス制御

### データ保護
- パスワードのbcryptハッシュ化
- HTTPS通信の強制
- SQLインジェクション対策（Prisma ORM）
- XSS対策（React自動エスケープ）
- CSRF対策（NextAuth.js内蔵）

## 現在の実装状況

### 実装済み機能
1. **ユーザー認証システム**
   - NextAuth.js を使用した認証システム
   - サインアップ/サインイン機能
   - JWT セッション管理
   - パスワードハッシュ化（bcrypt）

2. **データベース設計**
   - Prisma ORM による PostgreSQL 連携
   - User, Conversation, Chat テーブルの定義
   - 適切なリレーションと制約
   - カスケード削除の実装

3. **API エンドポイント**
   - 認証関連 API（register, signin）
   - 会話管理 API（CRUD操作）
   - チャット機能 API（詳細質問）

4. **UI コンポーネント**
   - shadcn/ui ベースのコンポーネント
   - 認証画面（signin, signup）
   - レスポンシブデザイン対応

### 開発中の機能
- 会話分析機能の実装
- Python API との連携
- メインダッシュボード
- 分析結果表示

### プロジェクト構造
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   └── register/
│   │   └── conversations/
│   │       ├── [id]/
│   │       │   ├── chat/
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── auth/
│   │   ├── signin/
│   │   └── signup/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   └── query-provider.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── textarea.tsx
├── lib/
│   ├── auth.ts
│   └── prisma.ts
└── types/
    └── next-auth.d.ts
```

## 開発環境セットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd mi_app

# Next.js依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# 以下の環境変数を設定:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL

# データベースのマイグレーション
npx prisma migrate dev

# 開発サーバーの起動
npm run dev
```

## デプロイメント

### Vercel デプロイ
1. **Next.jsアプリケーション**:
   - Vercelアカウントでプロジェクトを作成
   - GitHubリポジトリと連携
   - 環境変数を設定（DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL）
   - 自動デプロイの有効化

### データベース セットアップ
1. PostgreSQL データベースを作成（Supabase、Neon、または他のプロバイダー）
2. データベースURLを取得
3. Prismaスキーマを適用
4. 必要に応じて Row Level Security (RLS) を設定

### 環境変数
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-app.vercel.app"
```

## パフォーマンス最適化

### フロントエンド
- Next.js Image Optimizationの活用
- 動的インポートによるコード分割
- React Queryによるキャッシュ戦略
- Suspenseによる段階的レンダリング

### バックエンド
- データベースインデックスの最適化
- N+1問題の回避（Prisma include）
- API応答のページネーション
- Python FastAPIでのGPT-4 API並行処理
- Next.js ⇔ Python API間の効率的な通信

## 次のステップ

### 即座に実装が必要な機能
1. **メインダッシュボード**
   - 認証後のランディングページ
   - 新規分析開始フォーム
   - 過去の分析履歴表示

2. **会話分析機能**
   - テキスト入力フォーム
   - 4軸分析の実装
   - 分析結果の表示

3. **Python API 連携**
   - FastAPI サーバーの実装
   - OpenAI API との連携
   - 分析結果の JSON 返却

### 今後の拡張計画

#### Phase 1（3ヶ月）
- 分析結果のPDF/CSVエクスポート機能
- カスタム評価軸の追加・編集機能
- チーム機能（分析結果の共有）

#### Phase 2（6ヶ月）
- AIモデルの選択機能（GPT-4、Claude等）

#### Phase 3（12ヶ月）
- 機械学習による評価精度向上
- ビデオ会話の分析対応
- エンタープライズ向け機能（SAML SSO、監査ログ）

## 運用・保守

### モニタリング
- Vercel Analytics（パフォーマンス監視）
- Sentry（エラートラッキング）
- Supabase Dashboard（DB監視）

### バックアップ
- Supabase自動バックアップ（日次）
- 重要データの定期エクスポート

### サポート
- アプリ内フィードバック機能
- ヘルプドキュメントの整備
- コミュニティフォーラムの運営