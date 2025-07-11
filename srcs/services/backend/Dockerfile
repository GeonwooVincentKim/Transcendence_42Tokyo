FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY . .

RUN npm run build || cat /app/npm-debug.log

EXPOSE 8000

CMD ["node", "--trace-warnings", "dist/index.js"]