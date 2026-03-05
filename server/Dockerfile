FROM oven/bun:1-alpine AS base

WORKDIR /app

COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]
