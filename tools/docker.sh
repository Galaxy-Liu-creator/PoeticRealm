#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
env_file="$root/.env.docker"
command=${1:-up}

case "$command" in
  up|status|logs|stop|down) ;;
  *) printf '%s\n' '用法：./tools/docker.sh up|status|logs|stop|down' >&2; exit 1 ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  printf '%s\n' '未找到 Docker，请先安装 Docker Desktop 或 Docker Engine 与 Compose 插件。' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker 引擎尚未就绪，请启动 Docker Desktop 或 Docker daemon 后重试。' >&2
  exit 1
fi

compose() {
  docker compose --project-directory "$root" --file "$root/compose.yaml" --env-file "$env_file" "$@"
}

if [ "$command" = up ]; then
  if [ ! -f "$env_file" ]; then
    umask 077
    secret() { od -An -N32 -tx1 /dev/urandom | tr -d ' \n'; }
    (
      set -C
      printf 'DB_PASSWORD=%s\nDB_ROOT_PASSWORD=%s\nREMEMBER_ME_KEY=%s\nPOETIC_PORT=5173\nCOOKIE_SECURE=false\n' \
        "$(secret)" "$(secret)" "$(secret)" > "$env_file"
    )
    printf '%s\n' '已生成本机 .env.docker；后续启动会沿用此文件。'
  fi
  compose config --quiet
  compose up -d --build --wait --wait-timeout 240
  address=$(compose port frontend 8080)
  printf '诗境已启动：http://%s\n' "$address"
else
  if [ ! -f "$env_file" ]; then
    printf '%s\n' '请先执行 ./tools/docker.sh up。' >&2
    exit 1
  fi
  case "$command" in
    status) compose ps ;;
    logs) compose logs --tail 100 ;;
    stop|down) compose "$command" ;;
  esac
fi
