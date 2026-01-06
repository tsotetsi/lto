# Stage 1: Dependencies.
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files.
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies.
RUN npm ci

# Stage 2: Builder.
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public

# For Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# For Next.js static output (if not using standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/next.config.ts ./

# Set proper permissions.
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application.
CMD ["node", "server.js"]

# Stage 4: Development
FROM node:22-alpine AS dev
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose port and start the development server
EXPOSE 3000
CMD ["npm", "run", "dev"]