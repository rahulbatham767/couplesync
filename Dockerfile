# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
# We need all deps to build, but ci is faster and cleaner
RUN npm ci

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for env vars needed at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# HF Spaces strictly requires 7860
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# Create non-root user (HF Spaces requirement)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# --- FIX: Optional Copy for Public Folder ---
# Using wildcards allows the copy to succeed even if the folder is empty/missing
COPY --from=builder /app/public* ./public/

# Copy standalone build
# Note: standalone folder contains its own node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure the user has permissions for the app directory
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 7860

# Next.js standalone build generates a server.js file
CMD ["node", "server.js"]