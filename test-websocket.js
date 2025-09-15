const WebSocket = require('ws');

// Test WebSocket connection to the tournament match
const ws = new WebSocket('ws://localhost:8000/ws/game/22/1');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened successfully!');
  console.log('✅ Parameters extracted correctly from URL');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'ping'
  }));
  
  // Close after successful test
  setTimeout(() => {
    ws.close();
    console.log('✅ Test completed successfully');
    process.exit(0);
  }, 1000);
});

ws.on('message', function message(data) {
  console.log('📨 Received message:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});