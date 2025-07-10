import Fastify from 'fastify';

const server = Fastify();

server.get('/', async (request, reply) => {
  return { pong: 'it works!' };
});

const start = async () => {
  try {
    await server.listen({ port: 8000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:8000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();