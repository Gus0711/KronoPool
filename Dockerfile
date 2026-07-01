# --- Build ---------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# Dépendances (cache Docker sur package*.json).
COPY package*.json ./
RUN npm ci

# Source + build (adapter-node → ./build). Puis on retire les devDependencies.
COPY . .
# Filet de sécurité : ./data doit exister au cas où un module serveur tenterait
# d'ouvrir la base pendant l'analyse du build (la connexion est normalement lazy).
RUN mkdir -p ./data && npm run build && npm prune --omit=dev

# --- Runtime -------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/app.db
ENV PORT=3000
ENV HOST=0.0.0.0

# Artefacts nécessaires à l'exécution.
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && mkdir -p /data

# Volume persistant pour la base SQLite (à sauvegarder).
VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
