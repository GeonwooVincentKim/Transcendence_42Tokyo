# AI実装の詳細説明

## 📋 概要

このAI実装は、PongゲームのAI対戦相手として機能し、以下の要件を満たしています：
- A*アルゴリズムを使用しない
- 人間の行動を再現（キーボード入力をシミュレート）
- 1秒に1回だけゲームのビューを更新できる
- バウンスやその他のアクションを予測する
- 時々勝てる能力を持つ

---

## 🏗️ アーキテクチャ

### 主要コンポーネント

1. **`useAIController`** - AIコントローラーのメイン関数
2. **`calculateBallTrajectory`** - 物理ベースの軌道計算
3. **`predictBallPosition`** - ボール位置の予測
4. **`calculateMovement`** - AIの移動決定
5. **`simulateKeyboardInput`** - キーボード入力のシミュレート
6. **`moveAIPaddle`** - パドル移動の実行

---

## 🔧 実装の詳細

### 1. 1秒に1回の更新制限

**要件**: AIは1秒に1回だけゲームのビューを更新できる

**実装方法**:
```typescript
const VIEW_UPDATE_INTERVAL = 1000; // 1秒
let lastViewUpdateTime = Date.now();
let cachedGameState: any = null;
```

**動作**:
1. 1秒に1回、現在のゲーム状態を`cachedGameState`に保存
2. 1秒以内は、キャッシュされた状態から物理計算で予測的に更新
3. これにより、1秒間の制限を守りつつ、滑らかな動きを実現

**コード**:
```typescript:223:293:srcs/services/frontend/src-svelte/hooks/useAIController.ts
if (!forceUpdate && timeSinceLastViewUpdate < VIEW_UPDATE_INTERVAL) {
  // Use cached game state if available
  if (cachedGameState && cachedGameState.ball) {
    // Use physics-based trajectory calculation to predict current ball position
    timeSinceViewUpdate = timeSinceLastViewUpdate;
    const millisecondsElapsed = timeSinceViewUpdate;
    // At 60 FPS, 1 frame = 16.67ms, so calculate frames elapsed
    const framesElapsed = millisecondsElapsed / 16.67;
    
    // Calculate predicted position using physics formula
    // dx and dy are in pixels per frame, so we multiply by frames elapsed
    let predictedX = cachedGameState.ball.x + (cachedGameState.ball.dx * framesElapsed);
    let predictedY = cachedGameState.ball.y + (cachedGameState.ball.dy * framesElapsed);
    // ...壁の反射を計算...
  }
} else {
  // Update view (once per second)
  lastViewUpdateTime = currentTime;
  cachedGameState = { ball: { ...ball } };
}
```

---

### 2. 物理ベースの軌道計算

**要件**: AIはバウンスやその他のアクションを予測する必要がある

**実装方法**: 物理公式を使用した軌道計算

**アルゴリズム**:
1. **時間計算**: `timeToReachX = distanceX / |ball.dx|`
2. **壁の反射**: whileループで壁との衝突を計算
3. **最終位置**: `y = y0 + vy*t`（重力なし）

**コード**:
```typescript:106:182:srcs/services/frontend/src-svelte/hooks/useAIController.ts
const calculateBallTrajectory = (
  ball: { x: number; y: number; dx: number; dy: number },
  targetX: number,
  gameWidth: number = 800,
  gameHeight: number = 400
): { x: number; y: number; timeToReach: number } => {
  // Calculate time to reach target X position
  const distanceX = Math.abs(targetX - ball.x);
  const timeToReachX = distanceX / Math.abs(ball.dx);

  // Calculate final Y position considering wall bounces
  let finalY = ball.y + (ball.dy * timeToReachX);

  // Calculate wall bounces
  if (ball.dy !== 0) {
    let remainingTime = timeToReachX;
    let currentY = ball.y;
    let currentDy = ball.dy;

    while (remainingTime > 0.001) {
      // Calculate time to next wall collision
      let timeToWall: number;
      if (currentDy > 0) {
        timeToWall = (wallBottom - currentY) / currentDy;
      } else {
        timeToWall = (wallTop - currentY) / currentDy;
      }

      if (timeToWall > remainingTime) {
        currentY += currentDy * remainingTime;
        break;
      } else {
        // Hit wall, bounce
        currentY += currentDy * timeToWall;
        currentDy = -currentDy;
        remainingTime -= timeToWall;
      }
    }

    finalY = currentY;
  }

  return { x: targetX, y: finalY, timeToReach: timeToReachX };
};
```

**特徴**:
- A*アルゴリズムを使用しない
- 反復シミュレーションではなく、数学的公式を使用
- 壁の反射を正確に計算

---

### 3. キーボード入力のシミュレート

**要件**: AIは人間の行動を再現し、キーボード入力をシミュレートする必要がある

**実装方法**: `simulateKeyboardInput`関数でキーの押下/解放をシミュレート

**動作**:
1. 方向が変わったときだけ、キーの押下/解放をシミュレート
2. 同じ方向の場合は、キーを押し続ける動作をシミュレート
3. `setPaddleMovement`を呼び出してパドルを動かす

**コード**:
```typescript:75:99:srcs/services/frontend/src-svelte/hooks/useAIController.ts
let lastKeyboardDirection = 0;
const simulateKeyboardInput = (direction: number) => {
  // Only update if direction changed (simulate key press/release)
  if (direction !== lastKeyboardDirection) {
    if (direction !== 0) {
      setPaddleMovement('right', direction);
      lastKeyboardDirection = direction;
    } else {
      // Simulate releasing the key (stop movement)
      setPaddleMovement('right', 0);
      lastKeyboardDirection = 0;
    }
  } else if (direction !== 0) {
    // Keep the key pressed for continuous movement
    setPaddleMovement('right', direction);
  }
};
```

**特徴**:
- 人間のキーボード入力と同じ動作
- キーの押下/解放を正確にシミュレート
- 継続的な移動をサポート

---

### 4. 難易度設定

**実装**: 4つの難易度レベル（Easy, Medium, Hard, Expert）

**パラメータ**:
- **`reactionDelay`**: 反応遅延（ms）
- **`accuracy`**: 精度（0.0-1.0）
- **`predictionAccuracy`**: 予測精度（0.0-1.0）

**設定値**:
```typescript:60:73:srcs/services/frontend/src-svelte/hooks/useAIController.ts
const getDifficultySettings = (diff: AIDifficulty) => {
  switch (diff) {
    case 'easy':
      return { reactionDelay: 200, accuracy: 0.65, predictionAccuracy: 0.7 };
    case 'medium':
      return { reactionDelay: 100, accuracy: 0.85, predictionAccuracy: 0.85 };
    case 'hard':
      return { reactionDelay: 60, accuracy: 0.92, predictionAccuracy: 0.92 };
    case 'expert':
      return { reactionDelay: 30, accuracy: 0.97, predictionAccuracy: 0.97 };
    default:
      return { reactionDelay: 100, accuracy: 0.85, predictionAccuracy: 0.85 };
  }
};
```

**動作**:
- **Easy**: 反応が遅く（200ms）、精度が低い（65%）、予測精度が低い（70%）
- **Medium**: 反応が中程度（100ms）、精度が中程度（85%）、予測精度が中程度（85%）
- **Hard**: 反応が速い（60ms）、精度が高い（92%）、予測精度が高い（92%）
- **Expert**: 反応が非常に速い（30ms）、精度が非常に高い（97%）、予測精度が非常に高い（97%）

---

### 5. 移動決定アルゴリズム

**動作フロー**:

1. **ボールの方向を確認**
   - `ball.dx <= 0`: ボールが遠ざかっている → 中央に戻る
   - `ball.dx > 0`: ボールが近づいている → 予測して反応

2. **ボール位置の予測**
   - `predictBallPosition`関数で物理計算
   - 難易度に応じた予測誤差を適用

3. **移動方向の決定**
   - 予測位置と現在のパドル位置を比較
   - 距離が2ピクセル以上の場合に移動

4. **精度の適用**
   - 難易度に応じた確率で間違いを発生
   - Easy/Medium: 大きな間違い
   - Hard/Expert: 小さな間違い（遅延のみ）

**コード**:
```typescript:308:364:srcs/services/frontend/src-svelte/hooks/useAIController.ts
// Only react if ball is moving towards AI (right side)
if (ball.dx <= 0) {
  // Ball is moving away, move to center position for better defense
  const centerY = 200 - 40;
  targetY = centerY;
  distance = Math.abs(paddleY - centerY);
  shouldMove = distance > 3;
  if (shouldMove) {
    direction = paddleY < centerY ? 1 : -1;
  }
} else {
  // Ball is moving towards AI, predict and react
  prediction = predictBallPosition(ball, paddleY);
  const paddleHeight = 80;
  targetY = prediction.y - paddleHeight / 2;
  distance = Math.abs(paddleY - targetY);
  shouldMove = distance > 2;

  if (shouldMove) {
    direction = paddleY < targetY ? 1 : -1;
  }

  // Apply accuracy factor
  if (Math.random() > settings.accuracy) {
    // Make a mistake based on difficulty
    if (difficulty === 'hard' || difficulty === 'expert') {
      if (Math.random() > 0.7) {
        direction = 0; // Small delay
      }
    } else {
      // More significant mistakes
      if (Math.random() > 0.3) {
        direction = -direction; // Wrong direction
      } else {
        direction = 0; // Don't move
      }
    }
  }
}
```

---

### 6. メインループ

**実装**: `setInterval`で60 FPS（16ms間隔）で実行

**動作**:
1. ゲーム状態を購読
2. 毎フレーム`moveAIPaddle`を呼び出し
3. `moveAIPaddle`内で1秒制限をチェック
4. キャッシュされた状態から予測的に更新

**コード**:
```typescript:522:570:srcs/services/frontend/src-svelte/hooks/useAIController.ts
const startAI = () => {
  if (isRunning) return;
  
  isRunning = true;
  const config = getDifficultySettings(difficulty);
  
  // Subscribe to game state once
  let currentState: any = null;
  gameStateUnsubscribe = gameStateStore.subscribe(state => {
    currentState = state;
  });
  
  // Loop runs at 60 FPS
  animationId = setInterval(() => {
    if (!currentState) return;
    
    if (currentState.status === 'playing') {
      moveAIPaddle(currentState);
    } else {
      simulateKeyboardInput(0);
      // Stop loop if game is not playing
      if (animationId) {
        clearInterval(animationId);
        animationId = null;
        isRunning = false;
      }
    }
  }, 16); // 60 FPS
};
```

---

## 🎯 アルゴリズムの説明

### 予測アルゴリズム

1. **時間計算**: ボールがパドルに到達するまでの時間を計算
   ```
   timeToReach = distanceX / |ball.dx|
   ```

2. **壁の反射**: 時間内に壁に衝突する回数を計算
   ```
   while (remainingTime > 0.001) {
     timeToWall = (wallPosition - currentY) / currentDy
     if (timeToWall <= remainingTime) {
       // 壁に衝突
       currentDy = -currentDy
       remainingTime -= timeToWall
     }
   }
   ```

3. **最終位置**: 残り時間で最終位置を計算
   ```
   finalY = currentY + currentDy * remainingTime
   ```

### 移動決定アルゴリズム

1. **ボール方向の判定**: `ball.dx`で判定
2. **予測位置の計算**: `predictBallPosition`で計算
3. **目標位置の設定**: 予測位置からパドルの中心を計算
4. **移動方向の決定**: 現在位置と目標位置を比較
5. **精度の適用**: 難易度に応じた確率で間違いを発生

---

## 📊 パフォーマンス

### 更新頻度
- **ビュー更新**: 1秒に1回（要件準拠）
- **移動決定**: 60 FPS（16ms間隔）
- **物理計算**: 必要に応じて実行

### メモリ使用
- **キャッシュ**: ゲーム状態のみ（軽量）
- **予測計算**: O(1) - 定数時間

---

## 🔍 デバッグ情報

AIは以下のデバッグ情報を提供します：

```typescript
interface AIDebugInfo {
  lastMove: string;              // 最後の移動方向
  ballDirection: string;         // ボールの方向
  aiPosition: number;            // AIパドルの位置
  targetPosition: number;        // 目標位置
  isMoving: boolean;             // 移動中かどうか
  consecutiveMisses: number;    // 連続ミス数
  consecutiveHits: number;       // 連続ヒット数
  difficulty: AIDifficulty;      // 難易度
  prediction: { x: number; y: number } | null;  // 予測位置
  ballPosition: { x: number; y: number };      // ボール位置
  shouldMove: boolean;           // 移動すべきか
  reactionDelay: number;         // 反応遅延
  movementDirection: number;    // 移動方向
  distance: number;              // 距離
  lastViewUpdate: number;        // 最後のビュー更新時刻
  timeSinceLastUpdate: number;   // 更新からの経過時間
}
```

---

## ✅ 要件準拠の確認

| 要件 | 実装方法 | コード位置 |
|------|----------|------------|
| A*アルゴリズムの不使用 | 物理計算と予測アルゴリズム | `calculateBallTrajectory` |
| キーボード入力のシミュレート | `simulateKeyboardInput`関数 | 75-99行目 |
| 1秒に1回の更新制限 | `VIEW_UPDATE_INTERVAL = 1000` | 48-51行目、223-293行目 |
| バウンスの予測 | `predictBallPosition`と`calculateBallTrajectory` | 106-206行目 |
| 時々勝てる能力 | 難易度設定（accuracy: 0.65-0.97） | 60-73行目、344-363行目 |

---

## 💡 評価時の説明ポイント

### 1. 物理ベースの軌道計算
- 物理公式（`y = y0 + vy*t`）を使用
- 壁の反射を正確に計算
- A*アルゴリズムを使用しない

### 2. 1秒に1回の更新制限
- `VIEW_UPDATE_INTERVAL = 1000`で制限
- キャッシュされた状態から予測的に更新
- 移動決定はより頻繁に行える（要件準拠）

### 3. キーボード入力のシミュレート
- `simulateKeyboardInput`関数で実装
- キーの押下/解放をシミュレート
- 人間の行動を再現

### 4. 難易度設定
- Easy: accuracy 0.65, reactionDelay 200ms
- Medium: accuracy 0.85, reactionDelay 100ms
- Hard: accuracy 0.92, reactionDelay 60ms
- Expert: accuracy 0.97, reactionDelay 30ms

---

*最終更新: 2025年1月*

