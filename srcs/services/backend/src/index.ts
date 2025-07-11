import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

const server = Fastify();

// CORS 설정
server.register(cors, {
  origin: '*',
});

// WebSocket 지원
server.register(fastifyWebsocket);

// 기본 라우트
server.get('/', async (request, reply) => {
  return { pong: 'it works!' };
});

// API 라우트
server.get('/api/ping', async (request, reply) => {
  return { message: 'pong' };
});

// WebSocket 라우트
server.get('/ws', { websocket: true }, (connection, req) => {
  connection.socket.on('message', (message: Buffer) => {
    // Handle game messages
    connection.socket.send(JSON.stringify({ 
      type: 'game_update', 
      data: message.toString() 
    }));
  });
});

const start = async () => {
  try {
    console.log('Starting server...');
    await server.listen({ port: 8000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:8000');
  } catch (err) {
    console.error('Server error:', err);
    server.log.error(err);
    process.exit(1);
  }
};

start();