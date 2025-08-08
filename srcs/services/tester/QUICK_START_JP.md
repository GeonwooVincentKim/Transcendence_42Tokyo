# 🚀 Pong Game Project - クイックスタートガイド

このガイドはチームメンバーがプロジェクトを素早く開始できるよう支援します。

> **🌐 多言語版**: [한국어](QUICK_START.md) | [English](QUICK_START_EN.md)

## 📋 必要要件

- Node.js 18+
- npm または yarn
- Docker (オプション)
- Git

## ⚡ 5分クイックスタート

### 1. プロジェクトクローン
```bash
git clone <repository-url>
cd Trascendence/srcs
```

### 2. 全体サービス開始 (Docker)
```bash
docker-compose up --build
```

### 3. アクセス確認
- **ゲーム**: http://localhost:3000
- **API**: http://localhost:8000
- **ヘルスチェック**: http://localhost:8000/

## 🔧 開発モード

### Backend開発
```bash
cd services/backend
npm install
npm run dev
```

### Frontend開発
```bash
cd services/frontend
npm install
npm run dev
```

## 🧪 テスト実行

### 全体テスト (Windows)
```bash
.\run-all-tests.ps1
```

### 全体テスト (Linux/Mac)
```bash
./run-all-tests.sh
```

### 個別テスト
```bash
# Backendテスト
cd services/backend && npm test

# Frontendテスト
cd services/frontend && npm test

# 統合テスト
cd services/tester && npm test
```

## 📚 使用法例

### Linux/Mac
```bash
cd services/tester
npm run examples:linux
```

### Windows
```bash
cd services/tester
npm run examples:windows
```

### Dockerなしで実行
```bash
npm run examples:docker
```

## 🎮 ゲームプレイ

### コントロール
- **左パドル**: `W` (上) / `S` (下)
- **右パドル**: `↑` (上) / `↓` (下)

### 目標
相手のパドルを通過させないようにボールを防ぎながら、相手に得点を取ってください！

## 🔍 トラブルシューティング

### ポート競合
```bash
# ポート使用確認
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Docker整理
docker-compose down
docker system prune
```

### 依存関係問題
```bash
# node_modules再インストール
rm -rf node_modules package-lock.json
npm install
```

### Docker問題
```bash
# キャッシュなしで再ビルド
docker-compose build --no-cache
```

## 📖 詳細ドキュメント

- [全体使用法ガイド](README_JP.md)
- [APIドキュメント](API.md)
- [テストガイド](TESTING.md)

## 🆘 ヘルプ

問題が発生した場合:
1. このガイドを再確認
2. [全体使用法ガイド](README_JP.md)を参照
3. チームメンバーに相談

---

**Happy Gaming! 🏓**
