#!/usr/bin/env bash
set -euo pipefail

: "${RETENTION_DATABASE_NAME:?RETENTION_DATABASE_NAME is required}"
exec npm run retention -- --apply "--confirm-database=${RETENTION_DATABASE_NAME}"
