# Remote Access Configuration

このドキュメントでは、異なるPC/デバイスからアプリケーションにアクセスする方法を説明します。

## 🎉 自動IP解決機能

**重要**: アプリケーションは**実行時に自動的にIPアドレスを検出**します。  
**Wi-Fiを繋ぎ直しても、再ビルドや設定変更は不要です！**

### 動作の仕組み

- フロントエンドは `window.location.hostname` を使用してバックエンドURLを自動決定
- 同じホスト名（IPアドレス）でバックエンドに接続
- ビルド時にIPアドレスを埋め込まないため、IPが変わっても動作する

## 🚀 簡単な使い方

### 1. アプリケーションを起動

```bash
cd srcs
docker-compose up -d
```

または

```bash
make dev
```

### 2. アクセス

#### このPC（サーバー）から:
```
http://localhost:3000
```

#### 他のPCから（同じネットワーク内）:
```
http://<サーバーのIPアドレス>:3000
```

例: `http://172.20.10.11:3000`

**IPアドレスが変わっても、再ビルドは不要です！**  
ブラウザをリロードするだけで、新しいIPアドレスで自動的に接続されます。

## 📡 現在のIPアドレスを確認

```bash
# macOS/Linux
ifconfig en0 | grep "inet " | awk '{print $2}'

# Windows
ipconfig
```

## 🔧 詳細設定（オプション）

### 環境変数で固定URLを指定する場合

もし特定のURLを固定したい場合は、環境変数を設定できます：

```yaml
# docker-compose.yml
services:
  frontend:
    environment:
      - VITE_API_URL=http://192.168.1.100:8000
```

ただし、通常は**設定不要**です。自動検出で動作します。

## 🌐 アクセス方法

### ホストマシンから

- フロントエンド: `http://localhost:3000`
- バックエンドAPI: `http://localhost:8000`
- 開発版フロントエンド: `http://localhost:3002`
- テスター: `http://localhost:8080`

### 他のPCから（同じネットワーク内）

サーバーのIPアドレスを確認して、以下のURLでアクセス：

- フロントエンド: `http://<サーバーIP>:3000`
- バックエンドAPI: `http://<サーバーIP>:8000`

例: サーバーIPが `172.20.10.11` の場合
- `http://172.20.10.11:3000`
- `http://172.20.10.11:8000`

## 🔍 トラブルシューティング

### 1. 接続できない場合

#### ファイアウォールを確認

**macOS:**
```
システム環境設定 → セキュリティとプライバシー → ファイアウォール
ポート 3000 と 8000 を許可
```

**Linux (Ubuntu):**
```bash
sudo ufw allow 3000
sudo ufw allow 8000
```

**Windows:**
```
Windows Defender ファイアウォール → 詳細設定
受信の規則 → 新しい規則 → ポート 3000, 8000 を許可
```

#### Dockerネットワークを確認

```bash
docker network ls
docker network inspect srcs_default
```

### 2. CORS エラーが出る場合

開発環境では、バックエンドが**すべてのオリジンからのアクセスを許可**するように設定されています。

もしエラーが出る場合：
1. バックエンドのログを確認: `docker-compose logs backend`
2. `NODE_ENV=development` が設定されているか確認

### 3. WebSocket接続エラー

ブラウザの開発者ツール（F12）のコンソールで接続先を確認：

```
Connecting to Socket.IO server: http://<IP>:8000
```

正しいIPアドレスに接続されているか確認してください。

### 4. バックエンドに直接接続テスト

```bash
# サーバーPCから
curl http://localhost:8000/health

# 他のPCから
curl http://<サーバーIP>:8000/health
```

期待される結果: `{"status":"ok","database":"connected"}`

## 🎯 動作確認

### 1. フロントエンドの接続確認

ブラウザで `http://<サーバーIP>:3000` を開き、DevToolsのコンソールを確認：

```
Connecting to Socket.IO server: http://<サーバーIP>:8000
Socket.IO connected: abc123
```

### 2. バックエンドの接続確認

```bash
curl http://<サーバーIP>:8000/health
# {"status":"ok","database":"connected"}
```

## 📋 よくある質問

### Q: Wi-Fiを繋ぎ直したら、何か設定が必要ですか？

**A:** **いいえ、不要です！**  
アプリケーションは実行時に自動的にIPアドレスを検出するため、再ビルドや設定変更は不要です。  
ブラウザをリロードするだけで、新しいIPアドレスで動作します。

### Q: IPアドレスが変わったら、コンテナを再起動する必要がありますか？

**A:** **いいえ、不要です！**  
フロントエンドは実行時に `window.location.hostname` を使用するため、IPアドレスが変わっても自動的に対応します。

### Q: 複数のPCから同時にアクセスできますか？

**A:** **はい、可能です！**  
開発環境では、バックエンドがすべてのオリジンからのアクセスを許可するように設定されています。

### Q: 本番環境でも自動IP解決が使えますか？

**A:** 本番環境では、セキュリティのため具体的なドメインを指定することを推奨します：

```yaml
backend:
  environment:
    - CORS_ORIGIN=https://yourdomain.com
    - NODE_ENV=production
```

## 🔒 セキュリティ上の注意

1. **開発環境**: すべてのオリジンからのアクセスを許可（自動IP解決のため）
2. **本番環境**: 具体的なドメインを指定することを推奨
3. **ファイアウォール**: 不要なポートは閉じておく
4. **HTTPS**: 本番環境では必ずHTTPSを使用

## 📝 技術的な詳細

### フロントエンドのIP解決ロジック

```typescript
function getApiBaseUrl(): string {
  // 環境変数が設定されている場合はそれを使用
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 実行時に window.location.hostname から自動決定
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  return `${protocol}//${hostname}:8000`;
}
```

### バックエンドのCORS設定

開発環境では、すべてのオリジンからのアクセスを許可：

```typescript
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? allowedOrigins 
  : true; // 開発環境ではすべて許可
```

## まとめ

✅ **IPアドレス変更時の手動設定は不要**  
✅ **Wi-Fiを繋ぎ直しても再ビルド不要**  
✅ **ブラウザをリロードするだけで動作**  
✅ **複数のPCから同時アクセス可能**

これで、同じネットワーク内の他のPCから簡単にアクセスできます！🎉
