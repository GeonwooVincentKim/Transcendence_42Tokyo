# 変更サマリー - マルチPC対応とチャット機能改善

## 🎯 **全体の目的**
複数のPC（Mac、Windows等）から同じアプリケーションにアクセスし、オンライン対戦やチャット機能を利用できるようにする。

---

## 📋 **主な変更カテゴリー**

### 1. **CORS設定の修正（マルチPC対応）**

#### **目的**: 
異なるIPアドレスからのアクセスを許可

#### **変更ファイル**:
- `srcs/services/backend/src/index.ts`
- `srcs/services/backend/src/services/socketIOService.ts`

#### **変更内容**:
```typescript
// Before: 特定のlocalhostのみ許可
cors: {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}

// After: すべてのオリジンを動的に許可
server.addHook('onRequest', async (request, reply) => {
  const origin = request.headers.origin;
  if (origin) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
  }
  // ...
});

// Socket.IO CORS
this.io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      console.log(`Socket.IO CORS: Allowing origin="${origin}"`);
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

---

### 2. **フロントエンドの動的IP対応**

#### **目的**: 
`localhost`にハードコードされたURLを、アクセス元のIPアドレスに動的に変更

#### **変更ファイル**:
- `srcs/services/frontend/src/services/authService.ts` (React)
- `srcs/services/frontend/src/services/gameStatsService.ts` (React)
- `srcs/services/frontend/src/services/socketIOService.ts` (React)
- `srcs/services/frontend/src/services/tournamentService.ts` (React)
- `srcs/services/frontend/src/components/DeleteAccountPage.tsx` (React)
- `srcs/services/frontend/src/components/DeleteAccountModal.tsx` (React)
- `srcs/services/frontend/src-svelte/shared/services/authService.ts` (Svelte)
- `srcs/services/frontend/src-svelte/shared/services/gameStatsService.ts` (Svelte)
- `srcs/services/frontend/src-svelte/shared/services/socketIOService.ts` (Svelte)
- `srcs/services/frontend/src-svelte/shared/services/tournamentService.ts` (Svelte)
- `srcs/services/frontend/src-svelte/App.svelte` (Svelte)
- `srcs/services/frontend/src-svelte/components/FriendsList.svelte` (Svelte)

#### **変更内容**:
```typescript
// Before
const API_BASE_URL = 'http://localhost:8000';

// After (Svelte版 - 実行時評価を強制)
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.length > 0) return envUrl;
  // 動的にURLを構築
  return window.location.protocol + '//' + window.location.hostname + ':8000';
}

// React版
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
```

**重要**: Viteのビルド時評価を回避するため、文字列連結を使用

---

### 3. **CSP（Content Security Policy）の削除**

#### **目的**: 
HTMLのCSPが`localhost:8000`を固定していたため削除

#### **変更ファイル**:
- `srcs/services/frontend/index.html`
- `srcs/services/frontend/index-svelte.html`

#### **変更内容**:
```html
<!-- Before -->
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' http://localhost:8000 ws://localhost:8000">

<!-- After: CSPタグ削除、キャッシュ無効化ヘッダー追加 -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

---

### 4. **Dockerfileの修正**

#### **目的**: 
ビルド時にlocalhost:8000を挿入するsedコマンドを削除

#### **変更ファイル**:
- `srcs/services/frontend/Dockerfile`

#### **変更内容**:
```dockerfile
# Before
RUN npm run build:svelte && \
    sed -i 's|connect-src \x27self\x27|connect-src \x27self\x27 http://localhost:8000 ws://localhost:8000|g' dist-svelte/index-svelte.html

# After
RUN npm run build:svelte
```

---

### 5. **チャット機能の大幅改善**

#### **目的**: 
- すべてのチャンネル（public/protected）を表示
- パスワード保護チャンネルへの参加機能
- メンバーシップチェックの実装

#### **5-1. 新しいAPIエンドポイント追加**

**ファイル**: `srcs/services/backend/src/routes/chat.ts`

```typescript
// 新規エンドポイント
server.get('/api/chat/channels/all', async (request, reply) => {
  const channels = await ChatService.getAllChannels();
  return reply.status(200).send({ channels });
});

// メッセージ取得にメンバーシップチェック追加
server.get('/api/chat/channels/:channelId/messages', async (request, reply) => {
  const isMember = await ChatService.checkChannelMembership(userId, channelId);
  
  if (!isMember) {
    // publicチャンネルは自動参加
    if (channel && channel.type === 'public') {
      await ChatService.joinChannel(userId, channelId);
    } else {
      return reply.status(403).send({ error: 'Not a member of this channel' });
    }
  }
  // ...
});
```

#### **5-2. ChatService新メソッド追加**

**ファイル**: `srcs/services/backend/src/services/chatService.ts`

```typescript
// 新規メソッド1: すべてのチャンネルを取得
static async getAllChannels(): Promise<Channel[]> {
  // public + protected チャンネルを返す
  const result = await DatabaseService.query(`
    SELECT c.id, c.name, c.description, c.type, c.owner_id, c.created_at,
           COUNT(cm.id) as member_count
    FROM chat_channels c
    LEFT JOIN channel_members cm ON c.id = cm.channel_id
    WHERE c.type IN ('public', 'protected')
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return result;
}

// 新規メソッド2: メンバーシップチェック
static async checkChannelMembership(userId: string, channelId: string): Promise<boolean> {
  const result = await DatabaseService.query(
    'SELECT id FROM channel_members WHERE channel_id = ? AND user_id = ?',
    [channelId, userId]
  );
  return result.length > 0;
}
```

#### **5-3. フロントエンド: パスワードモーダル実装**

**ファイル**: `srcs/services/frontend/src-svelte/components/ChatInterface.svelte`

**追加機能**:
1. パスワード入力モーダルUI
2. protectedチャンネルのクリック処理
3. メンバーシップチェック関数

```typescript
// 状態変数追加
let showPasswordModal = false;
let joiningChannelId = '';
let joinPassword = '';

// チャンネルクリック処理
async function handleChannelClick(channel: any) {
  if (channel.type === 'public') {
    await loadChannelMessages(channel.id);
  } else if (channel.type === 'protected') {
    const canAccess = await tryLoadChannelMessages(channel.id);
    if (!canAccess) {
      joiningChannelId = channel.id;
      showPasswordModal = true;  // モーダル表示
    }
  }
}

// パスワード付き参加
async function joinWithPassword() {
  await joinChannel(joiningChannelId, joinPassword);
}
```

**UIコンポーネント**:
```html
<!-- パスワードモーダル -->
{#if showPasswordModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 class="text-xl font-bold mb-4">🔒 Protected Channel</h3>
      <input type="password" bind:value={joinPassword} placeholder="Enter channel password" />
      <button on:click={joinWithPassword}>Join Channel</button>
      <button on:click={() => showPasswordModal = false}>Cancel</button>
    </div>
  </div>
{/if}

<!-- チャンネルリスト表示 -->
{#each channels as channel}
  <div on:click={() => handleChannelClick(channel)}>
    {#if channel.type === 'protected'}
      <span>🔒</span>
    {/if}
    #{channel.name}
    <div class="text-sm">{channel.type} • {channel.memberCount} members</div>
  </div>
{/each}
```

#### **5-4. チャンネル読み込みロジック変更**

```typescript
// Before: 自分が参加しているチャンネルのみ
const response = await fetch('/api/chat/channels');

// After: 自分のチャンネル + すべての発見可能なチャンネル
const userChannelsResponse = await fetch('/api/chat/channels');
const allChannelsResponse = await fetch('/api/chat/channels/all');

// マージして重複を削除
const channelMap = new Map();
[...userChannels, ...allChannels].forEach(channel => {
  channelMap.set(channel.id, channel);
});
channels = Array.from(channelMap.values());
```

---

### 6. **その他の修正**

#### **6-1. MultiPlayerPong エラーメッセージ改善**

**ファイル**: `srcs/services/frontend/src-svelte/components/MultiPlayerPong.svelte`

**目的**: 無効なRoom ID形式に対してユーザーフレンドリーなエラーメッセージを表示

```typescript
let errorMessage = '';
let showErrorMessage = false;

// Room ID検証
if (!isValidRoomId) {
  errorMessage = `Invalid Room ID format: "${roomId}". Please use a number or tournament format`;
  showErrorMessage = true;
}
```

#### **6-2. キャッシュ無効化の強化**

**ファイル**: `srcs/services/frontend/index.html`, `index-svelte.html`

**目的**: ブラウザキャッシュによる古いコードの実行を防止

```html
<script>
  // 強制リロード（キャッシュバイパス）
  if (performance.navigation.type !== performance.navigation.TYPE_RELOAD) {
    const currentUrl = window.location.href;
    if (!currentUrl.includes('?nocache=')) {
      window.location.href = currentUrl + '?nocache=' + Date.now();
    }
  }
</script>
```

---

## 📊 **変更ファイル一覧**

### **バックエンド（4ファイル）**:
1. `srcs/services/backend/src/index.ts` - Fastify CORS設定
2. `srcs/services/backend/src/routes/chat.ts` - チャットルート、新エンドポイント
3. `srcs/services/backend/src/services/chatService.ts` - 新メソッド追加
4. `srcs/services/backend/src/services/socketIOService.ts` - Socket.IO CORS設定

### **フロントエンド（19ファイル）**:

**HTML/設定ファイル**:
5. `srcs/services/frontend/index.html` - CSP削除、キャッシュ無効化
6. `srcs/services/frontend/index-svelte.html` - CSP削除、キャッシュ無効化
7. `srcs/services/frontend/Dockerfile` - sed コマンド削除
8. `srcs/services/frontend/.env` - （環境変数設定）

**React版サービス**:
9. `srcs/services/frontend/src/services/authService.ts` - 動的IP対応
10. `srcs/services/frontend/src/services/gameStatsService.ts` - 動的IP対応
11. `srcs/services/frontend/src/services/socketIOService.ts` - 動的IP対応
12. `srcs/services/frontend/src/services/tournamentService.ts` - 動的IP対応

**React版コンポーネント**:
13. `srcs/services/frontend/src/components/DeleteAccountPage.tsx` - 動的IP対応
14. `srcs/services/frontend/src/components/DeleteAccountModal.tsx` - 動的IP対応

**Svelte版サービス**:
15. `srcs/services/frontend/src-svelte/shared/services/authService.ts` - 動的IP対応（実行時評価）
16. `srcs/services/frontend/src-svelte/shared/services/gameStatsService.ts` - 動的IP対応（実行時評価）
17. `srcs/services/frontend/src-svelte/shared/services/socketIOService.ts` - 動的IP対応
18. `srcs/services/frontend/src-svelte/shared/services/tournamentService.ts` - 動的IP対応（実行時評価）

**Svelte版コンポーネント**:
19. `srcs/services/frontend/src-svelte/App.svelte` - Socket.IO接続の動的IP対応
20. `srcs/services/frontend/src-svelte/components/ChatInterface.svelte` - パスワードモーダル、チャンネル表示改善
21. `srcs/services/frontend/src-svelte/components/FriendsList.svelte` - Socket.IO接続の動的IP対応
22. `srcs/services/frontend/src-svelte/components/MultiPlayerPong.svelte` - エラーメッセージ改善

**翻訳**:
23. `srcs/services/frontend/src-svelte/shared/locales/locales/jp/translations.json` - 日本語翻訳修正

---

## 🔧 **技術的なポイント**

### **1. Viteビルド時評価の回避**

**問題**: 
```typescript
const url = `http://${window.location.hostname}:8000`;
```
このコードはViteビルド時に評価されて`localhost`になってしまう。

**解決策**: 
```typescript
// 文字列連結を使用して実行時評価を強制
const url = window.location.protocol + '//' + window.location.hostname + ':8000';

// または関数内で毎回評価
function getApiBaseUrl() {
  return window.location.protocol + '//' + window.location.hostname + ':8000';
}
```

### **2. CORS設定の動的対応**

**ポイント**: `origin` ヘッダーをそのまま返すことで、どのIPからでもアクセス可能

```typescript
reply.header('Access-Control-Allow-Origin', origin);
reply.header('Access-Control-Allow-Credentials', 'true');
```

### **3. Socket.IO CORS**

**ポイント**: コールバック関数を使用してすべてのオリジンを許可

```typescript
cors: {
  origin: (origin, callback) => {
    callback(null, true);  // すべて許可
  },
  credentials: true
}
```

---

## 🎯 **達成された目標**

✅ **マルチPC対応**: 異なるIPアドレスからアクセス可能  
✅ **動的IP**: `localhost`固定から解放  
✅ **CORS問題解決**: Fastify、Socket.IO両方でCORS許可  
✅ **チャット機能改善**: public/protectedチャンネル対応  
✅ **パスワード保護**: protectedチャンネルへのパスワード入力機能  
✅ **メンバーシップ管理**: 適切なアクセス制御  
✅ **キャッシュ対策**: ブラウザキャッシュ問題の解決  

---

## 📝 **使用方法**

### **アクセス方法（例）**:
```
Mac IP: 172.20.10.11
アクセスURL: http://172.20.10.11:3000
```

### **チャット機能**:
- **Publicチャンネル**: 誰でも自動参加可能
- **Protectedチャンネル**: 🔒アイコン、パスワード入力で参加
- **すべてのチャンネル**: 両方とも表示される

---

## ⚠️ **注意事項**

1. **キャッシュクリア必須**: 変更後は必ずブラウザキャッシュをクリア
2. **IP変更時**: MacのIPアドレスが変わったら、新しいIPでアクセス
3. **開発環境**: 本番環境では適切なCORS設定に変更すべき

---

生成日時: 2025-11-07

