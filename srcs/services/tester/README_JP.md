# 🏓 Pong Game Project - 統合使用法ガイド

このフォルダは **Pong Game Projectの全体使用法と統合方法** を示すフレームワークです。

> **🌐 多言語版**: [한국어](README.md) | [English](README_EN.md)

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [サービス別使用法](#サービス別使用法)
3. [統合使用法](#統合使用法)
4. [テストフレームワーク](#テストフレームワーク)
5. [トラブルシューティング](#トラブルシューティング)

## 🎯 プロジェクト概要

### プロジェクト構造
```
srcs/
├── docker-compose.yml          # 全体サービス統合
├── run-all-tests.ps1          # Windowsテストスクリプト
├── run-all-tests.sh           # Linux/Macテストスクリプト
└── services/
    ├── backend/               # Fastify + WebSocketサーバー
    ├── frontend/              # React + Viteクライアント
    └── tester/                # このフォルダ - 使用法ガイド
```

### 技術スタック
- **Backend**: Fastify, TypeScript, WebSocket, PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **DevOps**: Docker, Docker Compose, Nginx
- **Testing**: Jest, Vitest, Cypress

## 🚀 サービス別使用法

### 1. Backendサービス

#### 開発モード実行
```bash
cd srcs/services/backend
npm install
npm run dev
```

#### テスト実行
```bash
npm test                    # 単体テスト
npm run test:watch         # 監視モード
npm run test:coverage      # カバレッジ付き
```

#### Docker実行
```bash
cd srcs
docker-compose up backend
```

#### 主要スクリプト
- `npm run dev`: 開発サーバー (ポート8000)
- `npm run build`: TypeScriptコンパイル
- `npm start`: 本番サーバー実行

### 2. Frontendサービス

#### 開発モード実行
```bash
cd srcs/services/frontend
npm install
npm run dev
```

#### テスト実行
```bash
npm test                    # Vitest単体テスト
npm run test:ui            # UIテストランナー
npm run test:coverage      # カバレッジ付き
npm run test:e2e           # Cypress E2Eテスト
```

#### ビルド・デプロイ
```bash
npm run build              # 本番ビルド
npm run preview            # ビルド結果プレビュー
```

#### Docker実行
```bash
cd srcs
docker-compose up frontend
```

### 3. Docker統合

#### 全体サービス実行
```bash
cd srcs
docker-compose up --build
```

#### 個別サービス実行
```bash
docker-compose up backend    # バックエンドのみ
docker-compose up frontend   # フロントエンドのみ
docker-compose up postgres   # データベースのみ
```

#### サービス状態確認
```bash
docker-compose ps           # 実行中サービス
docker-compose logs         # ログ確認
docker-compose down         # サービス停止
```

## 🔧 統合使用法

### 1. 全体プロジェクト開始

#### 方法1: Docker Compose (推奨)
```bash
cd srcs
docker-compose up --build
```

#### 方法2: 個別開発
```bash
# ターミナル1: Backend
cd srcs/services/backend
npm run dev

# ターミナル2: Frontend
cd srcs/services/frontend
npm run dev

# ターミナル3: Database (オプション)
docker run -d --name postgres \
  -e POSTGRES_DB=pong_db \
  -e POSTGRES_USER=pong_user \
  -e POSTGRES_PASSWORD=pong_password \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 環境設定

#### Backend環境変数
```bash
# .envファイル作成
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://pong_user:pong_password@localhost:5432/pong_db
```

#### Frontend環境変数
```bash
# .envファイル作成
VITE_API_URL=http://localhost:8000
```

### 3. ポート設定
- **Frontend**: http://localhost:3000 (開発) / http://localhost:80 (Docker)
- **Backend**: http://localhost:8000
- **Database**: localhost:5432

## 🧪 テストフレームワーク

### 1. 単体テスト

#### Backendテスト
```bash
cd srcs/services/backend
npm test
```

#### Frontendテスト
```bash
cd srcs/services/frontend
npm test
```

### 2. 統合テスト

#### 全体テスト実行 (Windows)
```bash
cd srcs
.\run-all-tests.ps1
```

#### 全体テスト実行 (Linux/Mac)
```bash
cd srcs
./run-all-tests.sh
```

#### E2Eテスト
```bash
cd srcs/services/frontend
npm run test:e2e:run
```

### 3. カバレッジ確認
```bash
# Backend
cd srcs/services/backend
npm run test:coverage

# Frontend
cd srcs/services/frontend
npm run test:coverage
```

## 🔍 トラブルシューティング

### 1. ポート競合
```bash
# ポート使用確認
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Dockerコンテナ整理
docker-compose down
docker system prune
```

### 2. 依存関係問題
```bash
# node_modules削除後再インストール
rm -rf node_modules package-lock.json
npm install
```

### 3. Docker問題
```bash
# Dockerキャッシュ整理
docker system prune -a
docker-compose build --no-cache
```

### 4. データベース問題
```bash
# PostgreSQLコンテナ再起動
docker-compose restart postgres

# データベース初期化
docker-compose down -v
docker-compose up postgres
```

## 📊 モニタリング

### 1. ログ確認
```bash
# 全体ログ
docker-compose logs

# 特定サービスログ
docker-compose logs backend
docker-compose logs frontend
```

### 2. 状態確認
```bash
# サービス状態
docker-compose ps

# リソース使用量
docker stats
```

## 🚀 デプロイ

### 1. 本番ビルド
```bash
# Frontendビルド
cd srcs/services/frontend
npm run build

# Backendビルド
cd srcs/services/backend
npm run build
```

### 2. Dockerデプロイ
```bash
cd srcs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 開発ガイドライン

### 1. コードスタイル
- TypeScript使用
- ESLintルール遵守
- テストコード作成
- JSDocコメント追加

### 2. Gitワークフロー
1. 機能ブランチ作成
2. 変更実装
3. テスト実行
4. リンティング確認
5. PR作成

### 3. テスト戦略
- 単体テスト: 関数/コンポーネント
- 統合テスト: APIエンドポイント
- E2Eテスト: ユーザーシナリオ

---

## 🎮 ゲームプレイ

### コントロール
- **左パドル**: `W` (上) / `S` (下)
- **右パドル**: `↑` (上) / `↓` (下)

### 目標
相手のパドルを通過させないようにボールを防ぎながら、相手に得点を取ってください！

---

**Happy Gaming! 🏓**
