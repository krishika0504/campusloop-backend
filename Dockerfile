# Production Multi-Stage Dockerfile for Google Cloud Run
FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL and libc compatibility for Prisma engine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src/

RUN npx prisma generate
RUN npm run build

# Production Runner Stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma Query Engine in production
RUN apk add --no-cache openssl libc6-compat curl

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

# Cloud Run binds to PORT (default 8080)
CMD ["node", "dist/server.js"]
