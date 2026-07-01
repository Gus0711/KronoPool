#!/bin/sh
set -e

# Applique les migrations sur le volume monté, crée/complète les comptes admin
# (idempotent — ignore ceux déjà présents), puis démarre le serveur (adapter-node).
node scripts/migrate.mjs
node scripts/seed.mjs
exec node build
