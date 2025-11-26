#!/bin/bash

# 現在のIPアドレスを取得
CURRENT_IP=$(ifconfig en0 | grep "inet " | awk '{print $2}')

if [ -z "$CURRENT_IP" ]; then
    echo "❌ IPアドレスを取得できませんでした"
    exit 1
fi

echo "📡 現在のIPアドレス: $CURRENT_IP"

# .envファイルを作成または更新
ENV_FILE=".env"
cat > "$ENV_FILE" << EOF
# 自動生成された環境変数ファイル
# このファイルは update-ip.sh によって自動更新されます

# フロントエンド用API URL
VITE_API_URL=http://${CURRENT_IP}:8000

# バックエンド用CORS設定
CORS_ORIGIN=http://${CURRENT_IP}:3000,http://${CURRENT_IP}:3002,http://localhost:3000,http://localhost:3002

# 現在のIPアドレス（参考用）
CURRENT_IP=${CURRENT_IP}
EOF

echo "✅ .envファイルを更新しました: $ENV_FILE"
echo ""
echo "📋 設定内容:"
cat "$ENV_FILE"
echo ""
echo "🚀 コンテナを再起動するには:"
echo "   cd srcs && docker-compose down && docker-compose up -d --build"



