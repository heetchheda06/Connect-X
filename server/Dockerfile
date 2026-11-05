# Production Dockerfile for ConnectX Backend
FROM node:22-alpine AS runner

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Ensure uploads and backups directories exist with correct permissions
RUN mkdir -p uploads backups

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]

