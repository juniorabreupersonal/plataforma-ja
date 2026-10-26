#!/usr/bin/env bash
# Nunca aceita DATABASE_URL ou conexão remota. Usa apenas contêiner novo sem rede/portas.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="postgres:17"
if ! docker image inspect "$image" >/dev/null 2>&1; then
  echo 'Imagem postgres:17 ausente. Obtenha a imagem oficial em ambiente autorizado antes de executar.' >&2
  exit 2
fi
container_id="$(docker run --pull never --detach --rm --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust "$image")"
cleanup() { docker rm --force "$container_id" >/dev/null 2>&1 || true; }
trap cleanup EXIT
ready=false
for attempt in {1..60}; do
  # O entrypoint inicia e encerra um servidor temporário durante o initdb.
  # Aguardar o postgres definitivo como PID 1 evita confundir essa janela com readiness.
  if docker exec "$container_id" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready --username postgres' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.25
done
if [[ "$ready" != true ]]; then
  echo 'PostgreSQL descartável não iniciou.' >&2
  exit 1
fi
{
  cat "$repo_root/supabase/tests/fixtures/auth_scaffold.sql"
  cat "$repo_root/supabase/tests/fixtures/existing_users.sql"
  cat "$repo_root/supabase/migrations/202610250001_identity_foundation.sql"
  cat "$repo_root/supabase/tests/identity_security.sql"
} | docker exec --interactive "$container_id" psql --username postgres --dbname postgres \
    --no-psqlrc --set ON_ERROR_STOP=on --quiet
echo 'Migração e testes SQL passaram no PostgreSQL descartável com contrato Auth simulado.'
echo 'Não substitui o aceite integrado em Supabase local/isolado nem testes de concorrência.'
