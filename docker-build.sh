#!/usr/bin/env sh
set -e

IMAGE_NAME=${1:-cf2dns:latest}
echo "Building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .
echo "Done. Use: docker run -it --rm -p 3000:3000 -e CLOUDFLARE_API_TOKEN=... $IMAGE_NAME"

