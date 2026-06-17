#!/bin/bash
# Push script for Dokploy-Ench

IMAGE_NAME="ghcr.io/hrnph/dokploy-ench"
BUILD_TYPE=${1:-production}

if [ "$BUILD_TYPE" == "canary" ]; then
    TAG="canary"
    docker buildx build --platform linux/amd64,linux/arm64 --pull --rm -t "${IMAGE_NAME}:${TAG}" -f 'Dockerfile' --push .
elif [ "$BUILD_TYPE" == "feature" ]; then
    TAG="feature"
    docker buildx build --platform linux/amd64,linux/arm64 --pull --rm -t "${IMAGE_NAME}:${TAG}" -f 'Dockerfile' --push .
else
    VERSION=$(node -p "require('./package.json').version")
    docker buildx build --platform linux/amd64,linux/arm64 --pull --rm -t "${IMAGE_NAME}:latest" -t "${IMAGE_NAME}:${VERSION}" -f 'Dockerfile' --push .
fi
