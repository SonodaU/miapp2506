# FastAPI リファクタリング計画

## 現在の問題点

1. **単一ファイルに全機能が集約** - `main.py`に295行のコードが集中
2. **責任分散不足** - 設定、モデル、ビジネスロジック、エンドポイントが混在
3. **保守性の低下** - 機能追加時のコード変更範囲が広い
4. **テストしにくい構造** - 単体テストが困難
5. **再利用性の欠如** - コンポーネント間の依存関係が複雑

## 目標とする構造

```
api/
├── main.py                    # FastAPI アプリケーション初期化
├── requirements.txt           # 依存関係
├── Dockerfile                # Docker設定
├── config/
│   ├── __init__.py
│   ├── settings.py           # 環境設定
│   └── database.py           # データベース設定（将来用）
├── models/
│   ├── __init__.py
│   ├── requests.py           # リクエストモデル
│   ├── responses.py          # レスポンスモデル
│   └── types.py              # 型定義
├── services/
│   ├── __init__.py
│   ├── analysis_service.py   # 分析ロジック
│   ├── chat_service.py       # チャットロジック
│   └── openai_service.py     # OpenAI API連携
├── core/
│   ├── __init__.py
│   ├── developer_message.py  # 開発者メッセージ管理
│   ├── prompt_manager.py     # プロンプト管理
│   └── utils.py              # ユーティリティ関数
├── routes/
│   ├── __init__.py
│   ├── analysis.py           # 分析エンドポイント
│   ├── chat.py               # チャットエンドポイント
│   └── health.py             # ヘルスチェック
└── tests/
    ├── __init__.py
    ├── test_analysis.py
    ├── test_chat.py
    └── test_services.py
```

## 実装計画

### Phase 1: 基本構造の作成
1. **ディレクトリ構造作成**
   - 必要なディレクトリとファイルを作成
   - `__init__.py`ファイルを配置

2. **設定系の分離**
   - `config/settings.py`: 環境変数管理
   - `config/database.py`: データベース接続（将来用）

3. **モデル系の分離**
   - `models/requests.py`: リクエストモデル
   - `models/responses.py`: レスポンスモデル
   - `models/types.py`: 型定義

### Phase 2: コアロジックの分離
1. **開発者メッセージシステム**
   - `core/developer_message.py`: DeveloperMessageConfig

2. **プロンプト管理システム**
   - `core/prompt_manager.py`: PromptManager

3. **ユーティリティ関数**
   - `core/utils.py`: 共通ユーティリティ

### Phase 3: サービス層の作成
1. **分析サービス**
   - `services/analysis_service.py`: 4軸分析ロジック

2. **チャットサービス**
   - `services/chat_service.py`: チャット機能

3. **OpenAI連携サービス**
   - `services/openai_service.py`: OpenAI API呼び出し

### Phase 4: ルーティングの分離
1. **エンドポイントの分離**
   - `routes/analysis.py`: 分析関連エンドポイント
   - `routes/chat.py`: チャット関連エンドポイント
   - `routes/health.py`: ヘルスチェック

2. **メインアプリケーションの簡素化**
   - `main.py`: FastAPIアプリ初期化とルーター登録のみ

### Phase 5: テスト構造の構築
1. **テストファイル作成**
   - 各サービスとエンドポイントのテスト
   - モックを使用した単体テスト

## 実装手順

### Step 1: ディレクトリ構造作成
```bash
mkdir -p api/{config,models,services,core,routes,tests}
touch api/{config,models,services,core,routes,tests}/__init__.py
```

### Step 2: 設定ファイルの作成
- `config/settings.py`: 環境変数とアプリケーション設定

### Step 3: モデル定義の分離
- 既存のPydanticモデルを`models/`に移動

### Step 4: コアロジックの分離
- `DeveloperMessageConfig`を`core/developer_message.py`に移動
- `PromptManager`を`core/prompt_manager.py`に移動

### Step 5: サービス層の実装
- 分析ロジックを`services/analysis_service.py`に移動
- OpenAI API呼び出しを`services/openai_service.py`に移動

### Step 6: ルーティングの分離
- エンドポイントを機能別に分離
- `main.py`を簡素化

### Step 7: テストの追加
- 各モジュールの単体テスト作成

## 期待される効果

1. **保守性の向上**
   - 責任の明確化
   - 変更影響範囲の限定

2. **テスタビリティの向上**
   - 単体テストが容易
   - モック使用が簡単

3. **可読性の向上**
   - ファイルサイズの適正化
   - 機能別の整理

4. **拡張性の向上**
   - 新機能追加が容易
   - 既存機能への影響最小化

5. **チーム開発の効率化**
   - 並行開発が可能
   - コードレビューが効率的

## 注意事項

1. **段階的な実装**
   - 一度に全てを変更せず、段階的に実装

2. **既存機能の保持**
   - 既存のAPI動作を維持

3. **依存関係の管理**
   - 循環依存を避ける
   - 依存関係を明確化

4. **エラーハンドリング**
   - 統一されたエラーハンドリング

5. **ドキュメント更新**
   - 変更に伴うドキュメント更新

## 実装完了後の検証

1. **機能テスト**
   - 全エンドポイントの動作確認
   - 既存機能の回帰テスト

2. **パフォーマンステスト**
   - レスポンス時間の確認
   - メモリ使用量の確認

3. **コード品質**
   - 静的解析の実行
   - コードカバレッジの確認