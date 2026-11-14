# -----------------------------------------------------------------------------
# Stage 1: Dependencies (deps)
# better-sqlite3 のネイティブビルドに必要なツールチェーンを導入して依存関係をインストール
# -----------------------------------------------------------------------------
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Next.js の standalone ビルドを実行
# -----------------------------------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner
# 最小限のフットプリントと非rootユーザーによる安全な本番実行環境
# -----------------------------------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_PATH=/app/data/sqlite.db

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# SQLite 永続化用ディレクトリの作成と権限設定
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# standalone 成果物と静的アセット・マイグレーション定義の配置
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

