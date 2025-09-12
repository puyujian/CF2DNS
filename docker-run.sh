#!/usr/bin/env sh
set -e

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN not set in environment" >&2
  echo "Usage: CLOUDFLARE_API_TOKEN=your_token ./docker-run.sh [image]" >&2
  exit 1
fi

IMAGE_NAME=${1:-cf2dns:latest}
RUN_ENVS=( -e CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" )
if [ -n "$ADMIN_PASSWORD" ]; then
  RUN_ENVS+=( -e ADMIN_PASSWORD="$ADMIN_PASSWORD" )
fi

docker run --name cf2dns --rm -p 3000:3000 "${RUN_ENVS[@]}" "$IMAGE_NAME"
