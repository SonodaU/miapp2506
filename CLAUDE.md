# CLAUDE.md - 会話分析・評価Webアプリケーション

## コーディング原則
- 可能な限り同じコードは繰り返さない。
- できるだけシンプルな実装とする。
- コンポーネントは小さく再利用可能に設計する。

## プロジェクト概要
AIを活用した高度な会話分析・評価システム。セラピーセッションなどの専門的な会話テキストを4つの評価軸（CCT、SST、共感、パートナーシップ）で多角的に分析し、詳細なフィードバックと改善提案を提供する。ユーザー認証とデータ永続化により、分析履歴の管理と継続的な改善をサポートする。

## 主要機能
1. **ユーザー認証システム** - セキュアなログイン/サインアップ機能
2. **会話テキスト分析** - 4つの評価軸による並行分析処理
3. **インタラクティブな詳細質問** - AIとのチャット形式での深掘り分析
4. **分析履歴管理** - 過去の分析結果の保存・閲覧・比較
5. **APIキー管理** - 独自のOpenAI APIキーの設定・管理
6. **レスポンシブデザイン** - デスクトップ・タブレット・モバイル対応

## 技術スタック

### フロントエンド
- **Framework**: Next.js 14 (App Router)
- **言語**: TypeScript
- **UI Library**: shadcn/ui + Radix UI
- **スタイリング**: Tailwind CSS
- **認証**: NextAuth.js
- **API通信**: 統一されたAPIクライアント

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

### 認証ページ
統一されたAuthFormコンポーネントでサインイン・サインアップを処理。中央配置のカードレイアウトで、メールアドレスとパスワードの入力フィールド、認証ボタン、相互リンクを配置。

### メインダッシュボード
AppLayoutコンポーネントでヘッダー構造を統一。ユーザー情報とAPIキー管理ボタンを配置。メインエリアは左側に新規分析セクション、右側に最近の分析履歴リストを表示する2カラムレイアウト。

### 分析ページ
分析結果の詳細表示とインタラクティブな質問機能。4つの評価軸をタブ形式で表示し、各発言をクリックすると詳細ダイアログが開く。おすすめ質問と文献参照オプションを提供。

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

### 会話分析エンドポイント
```
POST /api/conversations - 新規会話分析 ✅
GET /api/conversations - 分析履歴一覧取得 ✅
GET /api/conversations/[id] - 特定の分析結果取得 ✅
DELETE /api/conversations/[id] - 分析結果削除 ✅
POST /api/conversations/[id]/chat - 詳細質問チャット ✅
```

### ユーザー管理エンドポイント
```
GET /api/user/api-key - APIキー情報取得 ✅
PUT /api/user/api-key - APIキー更新 ✅
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
  apiKey        String?        @db.Text
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
- APIキーの暗号化保存
- HTTPS通信の強制
- SQLインジェクション対策（Prisma ORM）
- XSS対策（React自動エスケープ）
- CSRF対策（NextAuth.js内蔵）

## 現在の実装状況

### 実装済み機能
1. **ユーザー認証システム** ✅
   - NextAuth.js を使用した認証システム
   - 統一されたAuthFormコンポーネント
   - JWT セッション管理
   - パスワードハッシュ化（bcrypt）

2. **データベース設計** ✅
   - Prisma ORM による PostgreSQL 連携
   - User, Conversation, Chat テーブルの定義
   - 適切なリレーションと制約
   - カスケード削除の実装

3. **API エンドポイント** ✅
   - 認証関連 API（register, signin）
   - 会話管理 API（CRUD操作）
   - チャット機能 API（詳細質問）
   - APIキー管理 API

4. **UI コンポーネント** ✅
   - shadcn/ui ベースのコンポーネント
   - 統一されたレイアウトシステム
   - 再利用可能なコンポーネント群
   - レスポンシブデザイン対応

5. **メインダッシュボード** ✅
   - 新規分析フォーム
   - 分析履歴表示
   - APIキー管理ダイアログ
   - 統一されたヘッダーレイアウト

6. **分析結果表示** ✅
   - 4軸評価結果のタブ表示
   - インタラクティブな詳細質問
   - チャット履歴管理
   - おすすめ質問機能

### 現在のプロジェクト構造
```
src/
├── app/
│   ├── analysis/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts
│   │   │   └── register/
│   │   │       └── route.ts
│   │   ├── conversations/
│   │   │   ├── [id]/
│   │   │   │   ├── chat/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   └── user/
│   │       └── api-key/
│   │           └── route.ts
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── analysis/
│   │   ├── AnalysisResults.tsx
│   │   └── DetailDialog.tsx
│   ├── common/
│   │   ├── ErrorMessage.tsx
│   │   └── LoadingSpinner.tsx
│   ├── dashboard/
│   │   ├── ApiKeyDialog.tsx
│   │   ├── ConversationList.tsx
│   │   └── NewAnalysisForm.tsx
│   ├── forms/
│   │   └── AuthForm.tsx
│   ├── layouts/
│   │   └── AppLayout.tsx
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   └── query-provider.tsx
│   └── ui/
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── icons.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
├── hooks/
│   ├── useApiKeyManagement.ts
│   ├── useAuth.ts
│   └── useConversations.ts
├── lib/
│   ├── utils/
│   │   ├── date.ts
│   │   └── evaluation.ts
│   ├── api-client.ts
│   ├── auth.ts
│   ├── config.ts
│   ├── error-handler.ts
│   ├── prisma.ts
│   └── utils.ts
└── types/
    ├── analysis.ts
    └── next-auth.d.ts
```

## アーキテクチャ設計

### コンポーネント設計原則
1. **単一責任原則**: 各コンポーネントは明確な責任を持つ
2. **再利用性**: 複数の場所で使用可能な設計
3. **コンポジション**: 小さなコンポーネントの組み合わせ
4. **プロップスドリリング回避**: カスタムフックで状態管理

### カスタムフック設計
- **useAuth**: 認証状態の管理と認証チェック
- **useConversations**: 会話データのCRUD操作
- **useApiKeyManagement**: APIキーの管理と更新

### API設計
- **統一されたAPIクライアント**: 全てのAPI通信を一箇所で管理
- **統一されたエラーハンドリング**: 一貫したエラー処理
- **型安全性**: TypeScriptによる型チェック

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
- カスタムフックによる効率的な状態管理
- 共通コンポーネントの再利用

### バックエンド
- データベースインデックスの最適化
- N+1問題の回避（Prisma include）
- API応答のページネーション
- 統一されたエラーハンドリング

## 次のステップ

### 即座に実装が必要な機能
1. **Python API 連携** 🚧
   - FastAPI サーバーの実装
   - OpenAI API との連携
   - 分析結果の JSON 返却

2. **会話分析機能の完成** 🚧
   - 4軸分析の実装
   - 分析結果の詳細表示
   - 分析精度の向上

### 今後の拡張計画

#### Phase 1（1-2ヶ月）
- Python API の完全実装
- 分析機能の安定化
- エラーハンドリングの改善

#### Phase 2（3-4ヶ月）
- 分析結果のPDF/CSVエクスポート機能
- カスタム評価軸の追加・編集機能
- パフォーマンス最適化

#### Phase 3（6-12ヶ月）
- AIモデルの選択機能（GPT-4、Claude等）
- チーム機能（分析結果の共有）
- エンタープライズ向け機能

## 運用・保守

### モニタリング
- Vercel Analytics（パフォーマンス監視）
- Sentry（エラートラッキング）
- Supabase Dashboard（DB監視）

### バックアップ
- Supabase自動バックアップ（日次）
- 重要データの定期エクスポート

### コード品質
- TypeScript による型安全性
- 統一されたコーディング規約
- 再利用可能なコンポーネント設計
- 適切なエラーハンドリング

## 最新の改善点（リファクタリング完了）

### 2024年7月 - 大規模リファクタリング完了
1. **コンポーネントの共通化**
   - 重複コードの約60%削減
   - 再利用可能なコンポーネントの作成
   - 統一されたレイアウトシステム

2. **状態管理の改善**
   - カスタムフックによる状態管理
   - APIクライアントの統一
   - エラーハンドリングの統一

3. **開発体験の向上**
   - 型安全性の向上
   - 保守性の大幅改善
   - 拡張性の向上

4. **パフォーマンスの最適化**
   - 不要なレンダリングの削減
   - 効率的な状態管理
   - コンポーネントの最適化