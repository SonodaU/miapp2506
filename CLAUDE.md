# CLAUDE.md - 会話分析・評価Webアプリケーション

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
- **API Framework**: Next.js API Routes
- **ORM**: Prisma
- **データベース**: PostgreSQL (Supabase)
- **認証**: NextAuth.js + JWT
- **AI API**: OpenAI GPT-4o

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
POST /api/auth/register - 新規ユーザー登録
POST /api/auth/login - ログイン
POST /api/auth/logout - ログアウト
GET /api/auth/me - 現在のユーザー情報取得
```

### 分析エンドポイント
```
POST /api/conversations - 新規会話分析
GET /api/conversations - 分析履歴一覧取得
GET /api/conversations/:id - 特定の分析結果取得
DELETE /api/conversations/:id - 分析結果削除
POST /api/conversations/:id/chat - 詳細質問チャット
```

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
  user       User      @relation(fields: [userId], references: [id])
  chats      Chat[]
}
```

### Chat
```prisma
model Chat {
  id             String       @id @default(cuid())
  conversationId String
  aspect         String
  userQuestion   String       @db.Text
  aiResponse     String       @db.Text
  useReference   Boolean      @default(false)
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
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

## 開発環境セットアップ

```bash
# リポジトリのクローン
git clone [repository-url]
cd conversation-analyzer

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# 以下の環境変数を設定:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
# - OPENAI_API_KEY

# データベースのマイグレーション
npx prisma migrate dev

# 開発サーバーの起動
npm run dev
```

## デプロイメント

### Vercel デプロイ
1. Vercelアカウントでプロジェクトを作成
2. GitHubリポジトリと連携
3. 環境変数を設定
4. 自動デプロイの有効化

### Supabase セットアップ
1. Supabaseプロジェクトを作成
2. データベースURLを取得
3. Prismaスキーマを適用
4. Row Level Security (RLS) の設定

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
- GPT-4 API呼び出しの並行処理

## 今後の拡張計画

### Phase 1（3ヶ月）
- 分析結果のPDF/CSVエクスポート機能
- カスタム評価軸の追加・編集機能
- チーム機能（分析結果の共有）

### Phase 2（6ヶ月）
- AIモデルの選択機能（GPT-4、Claude等）

### Phase 3（12ヶ月）
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