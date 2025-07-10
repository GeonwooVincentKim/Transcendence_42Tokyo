import Fastify from 'fastify';
import cors from '@fastify/cors';

const server = Fastify();

// CORS configuration
server.register(cors, {
  origin: '*', // Use '*' for development, specify domain for production
});

// Default route
server.get('/', async (request, reply) => {
  return { pong: 'it works!' };
});

// API route example
server.get('/api/ping', async (request, reply) => {
  return { message: 'pong' };
});

const start = async () => {
  try {
    await server.listen({ port: 8000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:8000');
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
};

start();