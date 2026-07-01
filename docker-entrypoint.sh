#!/bin/sh
set -e

# Applique les migrations sur le volume monté, puis démarre le serveur (adapter-node).
node scripts/migrate.mjs
exec node build
