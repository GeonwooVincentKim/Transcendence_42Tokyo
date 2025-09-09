const WebSocket = require('ws');

console.log('Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:8000/ws/game/1/1?userId=test');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'join_room'
  }));
  
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'player_ready',
      ready: true
    }));
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('📨 Received:', JSON.parse(data.toString()));
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket closed:', code, reason.toString());
});

// Close after 5 seconds
setTimeout(() => {
  console.log('🔚 Closing WebSocket connection...');
  ws.close();
}, 5000);
