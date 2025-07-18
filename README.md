# 会話分析・評価システム

AIを活用した高度な会話分析・評価システム。セラピーセッションなどの専門的な会話テキストを4つの評価軸（Content、Emotion、Structure、Expression）で多角的に分析し、詳細なフィードバックと改善提案を提供します。

## 機能概要

- **ユーザー認証**: セキュアなログイン/サインアップ機能
- **会話テキスト分析**: 4つの評価軸による並行分析処理
- **インタラクティブな詳細質問**: AIとのチャット形式での深掘り分析
- **分析履歴管理**: 過去の分析結果の保存・閲覧・比較
- **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応

## 技術スタック

- **Frontend**: Next.js 14, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Next.js API Routes, FastAPI (Python), Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT-4o (Python API経由)

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. PostgreSQLデータベースの起動

データベースが必要です。以下のいずれかの方法でPostgreSQLを起動してください：

**Docker Composeを使用する場合（推奨）:**
```bash
# docker-compose.ymlファイルを作成してPostgreSQLを起動
docker-compose up -d postgres
```

**Dockerを直接使用する場合:**
```bash
docker run --name conversation-db \
  -e POSTGRES_DB=conversation_analyzer \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

**ローカルPostgreSQLを使用する場合:**
```bash
# PostgreSQLサービスを起動
sudo service postgresql start

# データベースを作成
createdb conversation_analyzer
```

### 3. Python API サーバーのセットアップ

```bash
# Python API ディレクトリに移動
cd api

# Python依存関係のインストール
pip install -r requirements.txt

# Python API用の環境変数を設定
cp .env.example .env
# .envファイルを編集してOPENAI_API_KEYを設定
```

### 4. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Database (上記の設定に合わせて調整)
DATABASE_URL="postgresql://postgres:password@localhost:5432/conversation_analyzer?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (Python API用)
OPENAI_API_KEY="your-openai-api-key-here"

# Python API
PYTHON_API_URL="http://localhost:8000"
PYTHON_API_TIMEOUT="120000"

# メール通知設定（長いテキスト分析用）
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

### 5. データベースのセットアップ

```bash
# Prismaクライアントを生成
npx prisma generate

# データベースマイグレーションを実行
npx prisma migrate dev --name init

# (オプション) Prisma Studioでデータベースを確認
npx prisma studio
```

### 6. 開発サーバーの起動

**Python APIサーバーを起動:**
```bash
cd api
python main.py
# または
uvicorn main:app --reload
```

**Next.jsアプリケーションを起動:**
```bash
# ルートディレクトリで
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。
Python APIは `http://localhost:8000` で動作します。

## テスト手順

### 前提条件

テストを開始する前に、以下が完了していることを確認してください：

1. **データベースが起動している**
   ```bash
   # Dockerの場合、コンテナが起動していることを確認
   docker ps | grep postgres
   
   # ローカルPostgreSQLの場合
   sudo service postgresql status
   ```

2. **環境変数が正しく設定されている**
   ```bash
   # .env.localファイルの存在確認
   ls -la .env.local
   
   # 必要な環境変数が設定されていることを確認
   cat .env.local
   ```

3. **Prismaマイグレーションが完了している**
   ```bash
   # マイグレーション状況を確認
   npx prisma migrate status
   
   # 必要に応じてマイグレーションを実行
   npx prisma migrate dev
   ```

4. **開発サーバーが起動している**
   ```bash
   # Python APIサーバー
   cd api && python main.py
   
   # Next.jsアプリケーション
   npm run dev
   ```

### 基本機能テスト

#### 1. ユーザー認証テスト

**新規ユーザー登録**
1. `http://localhost:3000` にアクセス
2. 「新規登録」リンクをクリック
3. 以下の情報を入力：
   - 名前: `テストユーザー`
   - メールアドレス: `test@example.com`
   - パスワード: `test123456`
   - パスワード確認: `test123456`
4. 「アカウント作成」ボタンをクリック
5. ログインページにリダイレクトされることを確認

**ログイン**
1. ログインページで以下を入力：
   - メールアドレス: `test@example.com`
   - パスワード: `test123456`
2. 「ログイン」ボタンをクリック
3. ダッシュボードページにリダイレクトされることを確認

#### 2. 会話分析機能テスト

**新規分析の作成**
1. ダッシュボードの「新規分析」セクションで以下のサンプルテキストを入力：

```
セラピスト: 今日はどのような気持ちでいらっしゃいましたか？
クライアント: 最近、仕事でのストレスが溜まっていて、なかなか眠れない日が続いています。
セラピスト: そうでしたか。それは辛い状況ですね。具体的にはどのようなことがストレスの原因になっているのでしょうか？
クライアント: 上司からの期待が高くて、プレッシャーを感じています。失敗したらどうしようという不安が頭から離れません。
セラピスト: 不安を感じられているのですね。その不安はいつ頃から強くなったのでしょうか？
クライアント: 先月から新しいプロジェクトを任されて、それ以来ずっとです。
```

2. 「分析開始」ボタンをクリック
3. 分析が実行され、結果ページにリダイレクトされることを確認
4. 4つの評価軸（Content、Emotion、Structure、Expression）の結果が表示されることを確認

**分析結果の確認**
1. 各評価軸のカードに複数の発言と評価が表示されることを確認
2. 評価アイコン（良好、注意、問題）が適切に表示されることを確認
3. 発言をクリックして詳細ダイアログが開くことを確認

#### 3. 詳細質問機能テスト

**詳細質問の送信**
1. 任意の評価カードをクリックして詳細ダイアログを開く
2. 質問入力欄に以下を入力：
   ```
   この発言の改善点を具体的に教えてください。
   ```
3. 「送信」ボタンをクリック
4. AIからの回答が表示されることを確認

**文献参照オプションのテスト**
1. 「文献参照を含める」チェックボックスをオンにする
2. 以下の質問を入力：
   ```
   このようなケースでの心理学的アプローチについて、理論的背景も含めて説明してください。
   ```
3. 送信後、学術的な根拠を含む回答が得られることを確認

#### 4. 履歴管理機能テスト

**分析履歴の確認**
1. ダッシュボードの「最近の分析履歴」セクションを確認
2. 先ほど作成した分析が一覧に表示されることを確認
3. 履歴項目をクリックして分析結果ページに移動できることを確認

**複数分析の作成**
1. ダッシュボードに戻る（「ダッシュボードに戻る」ボタンを使用）
2. 別のサンプルテキストで新しい分析を作成：

```
カウンセラー: お疲れ様です。今日はどのようなことについてお話ししたいですか？
相談者: 人間関係で悩んでいます。職場で同僚とうまくコミュニケーションが取れません。
カウンセラー: どのような場面で困難を感じますか？
相談者: 会議で意見を言うのが怖くて、いつも黙ってしまいます。
```

3. 履歴に2つの分析が表示されることを確認

### エラーハンドリングテスト

#### 1. 認証エラーテスト

**無効なログイン情報**
1. ログアウト後、無効なメールアドレス/パスワードでログインを試行
2. 適切なエラーメッセージが表示されることを確認

**重複ユーザー登録**
1. 既存のメールアドレスで新規登録を試行
2. 「User already exists」エラーが表示されることを確認

#### 2. 入力検証テスト

**空の分析テキスト**
1. テキストエリアを空のまま「分析開始」ボタンをクリック
2. ボタンが無効化されており、クリックできないことを確認

**短いパスワード**
1. 6文字未満のパスワードで新規登録を試行
2. 適切なエラーメッセージが表示されることを確認

### レスポンシブデザインテスト

#### 1. モバイル表示テスト
1. デベロッパーツールでモバイル表示に切り替え
2. 各ページが適切にレスポンシブ対応されていることを確認：
   - ログイン/サインアップページ
   - ダッシュボード（カラムが縦に並ぶ）
   - 分析結果ページ（カードが縦に並ぶ）

#### 2. タブレット表示テスト
1. タブレットサイズで表示を確認
2. レイアウトが適切に調整されていることを確認

### パフォーマンステスト

#### 1. 大きなテキストの分析
1. 長い会話テキスト（2000文字以上）で分析を実行
2. 処理時間が妥当な範囲内であることを確認
3. メモリリークが発生しないことを確認

#### 2. 同時アクセステスト
1. 複数のブラウザタブで同時にログイン
2. それぞれのセッションが独立して動作することを確認

### セキュリティテスト

#### 1. 認証制御テスト
1. ログアウト状態で `/dashboard` に直接アクセス
2. ログインページにリダイレクトされることを確認
3. 他のユーザーの分析結果URLに直接アクセス
4. 403エラーまたは適切なアクセス制御が働くことを確認

#### 2. XSS対策テスト
1. 分析テキストに以下を含めて送信：
   ```
   <script>alert('XSS')</script>
   ```
2. スクリプトが実行されず、テキストとして表示されることを確認

## トラブルシューティング

### よくある問題

**1. データベース接続エラー**
```
Error: @prisma/client did not initialize yet
```
解決方法：
```bash
npx prisma generate
npx prisma migrate dev
```

**2. OpenAI API エラー**
```
Error: Unauthorized (401)
```
- `OPENAI_API_KEY` が正しく設定されているか確認
- APIキーの使用制限に達していないか確認

**3. NextAuth セッションエラー**
```
[next-auth][error][SESSION_ERROR]
```
- `NEXTAUTH_SECRET` が設定されているか確認
- `NEXTAUTH_URL` が正しいか確認

**4. ビルドエラー**
```
Type errors in application
```
- TypeScriptの型エラーを修正
- 依存関係を最新バージョンに更新

### デバッグ方法

**1. サーバーログの確認**
```bash
# 開発モードでの詳細ログ
npm run dev

# データベースクエリのログ
DATABASE_URL="..." npx prisma studio
```

**2. ブラウザデベロッパーツール**
- Network タブでAPI呼び出しを確認
- Console タブでJavaScriptエラーを確認
- Application タブでLocalStorageとCookieを確認

**3. Prisma デバッグ**
```bash
# データベーススキーマの確認
npx prisma db pull

# マイグレーション状況の確認
npx prisma migrate status
```

## 本番環境デプロイ

### Vercel デプロイ

1. **Next.jsアプリケーション:**
   - GitHubリポジトリをVercelに接続
   - 環境変数を設定：
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (本番URL)
     - `PYTHON_API_URL` (Python APIの本番URL)
   - ビルドコマンド: `npm run build`
   - 自動デプロイの設定

2. **Python API:**
   - RailwayやRenderなどでPython APIをデプロイ
   - または、Vercel Functionsでデプロイ
   - 環境変数 `OPENAI_API_KEY` を設定

### データベース (Supabase)

1. Supabaseプロジェクトを作成
2. PostgreSQLデータベースのURLを取得
3. Prismaマイグレーションを実行：
   ```bash
   DATABASE_URL="supabase-url" npx prisma migrate deploy
   ```

## メール通知設定

### 概要

システムでは2000字を超える長いテキストの分析時に、非同期処理とメール通知機能を提供しています：

- **2000字以下**: 即座に分析結果を表示
- **2000字超**: バックグラウンドで分析実行後、メールで完了通知

### SMTP設定の詳細

#### 各設定項目の説明

| 項目 | 説明 | 例 |
|------|------|-----|
| `SMTP_HOST` | SMTPサーバーのホスト名 | `smtp.gmail.com` |
| `SMTP_PORT` | SMTPサーバーのポート番号 | `587` (TLS推奨) |
| `SMTP_USER` | 送信用メールアドレス | `your-app@gmail.com` |
| `SMTP_PASS` | **アプリパスワード**（通常パスワード不可） | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | 送信者として表示されるアドレス | `your-app@gmail.com` |

#### 主要プロバイダー設定

**Gmail**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-16-character-app-password"
SMTP_FROM="your-gmail@gmail.com"
```

**Outlook/Hotmail**
```env
SMTP_HOST="smtp.live.com"
SMTP_PORT="587"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@outlook.com"
```

**SendGrid（商用推奨）**
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="noreply@yourdomain.com"
```

### Gmail設定手順

#### Step 1: Googleアカウントでアプリパスワードを生成

1. **Google アカウントにログイン**
   - [myaccount.google.com](https://myaccount.google.com) にアクセス

2. **セキュリティ設定**
   - 左メニューの「セキュリティ」をクリック

3. **2段階認証を有効化**（まだの場合）
   - 「Googleへのログイン」セクション
   - 「2段階認証プロセス」を有効にする

4. **アプリパスワードを生成**
   - 「Googleへのログイン」セクション
   - 「アプリパスワード」をクリック
   - アプリ名: `Conversation Analyzer`
   - 生成された16文字のパスワードをコピー

#### Step 2: 環境変数の設定

```env
# Gmail設定例
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail-address@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"  # ←生成されたアプリパスワード
SMTP_FROM="your-gmail-address@gmail.com"
```

### セキュリティ注意事項

⚠️ **重要な注意点**

- **通常のパスワードは使用禁止** - 必ずアプリパスワードを使用
- **環境変数は`.env`ファイルに記載** - Gitにコミットしない
- **Gmail制限**: 1日500通、1時間100通
- **商用利用**: SendGridなどの専用サービス推奨

### メール通知のテスト

メール設定後、以下でテストできます：

```bash
# 開発環境でテスト（2000字超のテキストで分析実行）
# システムが自動的にメール通知を送信
```

### メール通知の流れ

1. **長いテキスト（2000字超）投稿時**:
   ```
   POST /api/conversations
   ↓
   ポップアップ表示「時間を要します。終了したらメールでお知らせします」
   ↓
   DB保存（status: pending）
   ↓
   HTTP 202 Accepted 返却
   ↓
   バックグラウンドで分析実行
   ↓
   分析完了後メール送信
   ```

2. **送信されるメール内容**:
   - 件名: 「会話分析が完了しました」
   - 内容: 分析結果ページへのリンク付きHTML

### トラブルシューティング

**メール送信エラー**
```
Error: Invalid login
```
- アプリパスワードが正しく設定されているか確認
- 2段階認証が有効になっているか確認

**認証エラー**
```
Error: Username and Password not accepted
```
- `SMTP_USER`と`SMTP_PASS`の値を再確認
- Gmail以外の場合、そのプロバイダーの設定を確認
