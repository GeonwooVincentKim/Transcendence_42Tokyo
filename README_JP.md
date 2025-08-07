# Pong Game Project - Common Framework

モダンなWeb技術で構築された包括的なマルチプレイヤーPongゲーム。

## 🚀 クイックスタート

### 前提条件
- **Node.js** 18+ 
- **Docker** と Docker Compose
- **Git**

### インストール
```bash
# リポジトリをクローン
git clone <repository-url>
cd Trascendence

# 全サービスの依存関係をインストール
cd srcs/services/backend && npm install
cd ../frontend && npm install
cd ../tester && npm install
cd ../..
```

### 開発環境
```bash
# Docker Composeで全サービスを起動
cd srcs
docker-compose up --build

# アプリケーションにアクセス
# フロントエンド: http://localhost:3000
# バックエンドAPI: http://localhost:8000
# データベース: localhost:5432
```

### テスト実行
```bash
# 全テストを実行 (Windows PowerShell)
.\run-all-tests.ps1

# 全テストを実行 (Linux/macOS)
./run-all-tests.sh

# 特定のサービステストを実行
cd srcs/services/backend && npm test
cd ../frontend && npm test
cd ../tester && npm test
```

## 📁 プロジェクト構造

```
Trascendence/
├── srcs/
│   ├── services/
│   │   ├── backend/          # Node.js + Express API
│   │   ├── frontend/         # React + TypeScript + Vite
│   │   ├── docker/           # Docker設定
│   │   └── tester/           # 包括的テストフレームワーク
│   ├── docker-compose.yml    # マルチサービスオーケストレーション
│   ├── run-all-tests.sh     # Linux/macOSテストランナー
│   └── run-all-tests.ps1    # Windowsテストランナー
├── README_EN.md             # 英語ドキュメント
├── README_JP.md             # 日本語ドキュメント
└── TESTING.md               # 詳細テストガイド
```

## 🏗️ アーキテクチャ

### サービス概要

#### 1. バックエンドサービス
- **技術**: Node.js + Express + TypeScript
- **データベース**: PostgreSQL
- **機能**: 
  - RESTful APIエンドポイント
  - JWT認証
  - ゲーム状態管理
  - ユーザー管理
  - リアルタイム通信

#### 2. フロントエンドサービス
- **技術**: React 19 + TypeScript + Vite
- **スタイリング**: TailwindCSS
- **機能**:
  - レスポンシブゲームインターフェース
  - リアルタイムゲームレンダリング
  - ユーザー認証UI
  - ゲームコントロールと設定

#### 3. Dockerサービス
- **技術**: Docker + Docker Compose
- **機能**:
  - マルチサービスオーケストレーション
  - 開発・本番環境
  - データベース初期化
  - ネットワーク設定

#### 4. テスターサービス
- **技術**: Jest + Cypress + TypeScript
- **機能**:
  - ユニットテストフレームワーク
  - CypressによるE2Eテスト
  - APIテストユーティリティ
  - パフォーマンステスト
  - テストデータ生成

## 🎮 ゲーム機能

### コアゲームプレイ
- **クラシックPongメカニクス**とモダンな拡張
- **リアルタイムマルチプレイヤー**サポート
- **AI対戦相手**のシングルプレイヤーモード
- **スコア追跡**と統計
- **ゲーム状態永続化**

### ユーザーエクスペリエンス
- **全デバイス対応**のレスポンシブデザイン
- **スムーズなアニメーション**と視覚的フィードバック
- **カスタマイズ可能なゲーム設定**
- **リーダーボード**とランキング
- **ユーザープロフィール**と統計

### 技術的特徴
- **WebSocket**リアルタイム通信
- **JWTベース認証**
- **データベース永続化**
- **エラーハンドリング**とログ
- **パフォーマンス最適化**

## 🛠️ 開発

### 新機能追加

#### バックエンド開発
```bash
cd srcs/services/backend
npm run dev          # 開発サーバー起動
npm test             # テスト実行
npm run build        # 本番用ビルド
```

#### フロントエンド開発
```bash
cd srcs/services/frontend
npm run dev          # 開発サーバー起動
npm test             # テスト実行
npm run build        # 本番用ビルド
```

#### テスト
```bash
cd srcs/services/tester
npm test             # 全テスト実行
npm run test:e2e     # E2Eテスト実行
npm run test:coverage # カバレッジ付きテスト
```

### コード標準

#### TypeScript
- **Strict mode**有効
- **ESLint**によるコード品質
- **Prettier**によるフォーマット
- **型安全性**の徹底

#### テスト
- **Jest**によるユニットテスト
- **Cypress**によるE2Eテスト
- **テストカバレッジ**要件
- **テーブル駆動テスト**パターン

#### ドキュメント
- **JSDoc**コメントによる関数説明
- **各サービスのREADME**ファイル
- **APIドキュメント**と例
- **コード例**とチュートリアル

## 🧪 テスト戦略

### テストカテゴリ

1. **ユニットテスト**
   - 個別関数テスト
   - コンポーネントテスト
   - ビジネスロジック検証

2. **統合テスト**
   - APIエンドポイントテスト
   - サービス間相互作用テスト
   - データベース統合テスト

3. **E2Eテスト**
   - 完全なユーザーワークフロー
   - クロスブラウザ互換性
   - レスポンシブデザインテスト

4. **パフォーマンステスト**
   - レスポンス時間テスト
   - 負荷テスト
   - メモリ使用量監視

### テスト実行

#### 全テスト
```bash
# Windows
.\run-all-tests.ps1

# Linux/macOS
./run-all-tests.sh
```

#### 特定のテストタイプ
```bash
# バックエンドテストのみ
cd srcs/services/backend && npm test

# フロントエンドテストのみ
cd srcs/services/frontend && npm test

# E2Eテストのみ
cd srcs/services/frontend && npx cypress run
```

## 🚀 デプロイメント

### 本番ビルド
```bash
# 全サービスをビルド
cd srcs/services/backend && npm run build
cd ../frontend && npm run build

# 本番サービスを起動
cd ../..
docker-compose -f docker-compose.prod.yml up -d
```

### 環境変数
```env
# バックエンド
NODE_ENV=production
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db

# フロントエンド
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Pong Game
```

## 🤝 コントリビューション

### 開発ワークフロー

1. **リポジトリをフォーク**
2. **機能ブランチを作成**
3. **テスト付きで開発**
4. **ローカルで全テスト実行**
5. **プルリクエストを提出**

### コードレビューチェックリスト

- [ ] **テストがローカルで通る**
- [ ] **コードがスタイルガイドラインに従う**
- [ ] **ドキュメントが更新されている**
- [ ] **コンソールエラーや警告がない**
- [ ] **パフォーマンスが許容範囲内**

### コミットガイドライン

```
feat: 新しいゲームモードを追加
fix: 認証問題を解決
docs: APIドキュメントを更新
test: ユーザーサービスのユニットテストを追加
refactor: ゲーム状態管理を改善
```

## 📚 ドキュメント

### サービスドキュメント
- [バックエンドサービス](./srcs/services/backend/README.md)
- [フロントエンドサービス](./srcs/services/frontend/README.md)
- [テスターサービス](./srcs/services/tester/README.md)
- [テストガイド](./TESTING.md)

### APIドキュメント
- **ベースURL**: `http://localhost:8000`
- **認証**: JWT Bearerトークン
- **Content-Type**: `application/json`

### 共通エンドポイント
```
GET    /health              # ヘルスチェック
GET    /api/game/state      # ゲーム状態取得
POST   /api/auth/register   # ユーザー登録
POST   /api/auth/login      # ユーザーログイン
GET    /api/users/profile   # ユーザープロフィール取得
```

## 🐛 トラブルシューティング

### よくある問題

#### Docker問題
```bash
# Docker状態を確認
docker info

# Dockerサービスを再起動
docker-compose down
docker-compose up --build
```

#### ポート競合
```bash
# ポート使用状況を確認
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/macOS
```

#### データベース問題
```bash
# データベースをリセット
docker-compose down -v
docker-compose up --build
```

#### テスト失敗
```bash
# テストキャッシュをクリア
npm test -- --clearCache

# 詳細出力で実行
npm test -- --verbose
```

### ヘルプの取得

1. **ログを確認**: `docker-compose logs`
2. **サービスを確認**: `docker-compose ps`
3. **テストを実行**: テストスクリプトを使用
4. **ドキュメントを確認**: サービスREADMEファイル

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 👥 チーム

- **バックエンド開発者**: APIとデータベース開発
- **フロントエンド開発者**: UI/UXとゲームインターフェース
- **DevOpsエンジニア**: Dockerとデプロイメント
- **QAエンジニア**: テストと品質保証

## 🔗 リンク

- **リポジトリ**: [GitHub Repository]
- **ドキュメント**: [Project Wiki]
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

---

**Happy Coding! 🎮**
